import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, useTheme, Card, Divider, Appbar, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';
import { io, Socket } from 'socket.io-client';
import { AuthService } from '../../../../services/auth.service';

import { API_BASE_URL } from '../../../../constants/api';
const API_URL = API_BASE_URL.replace('/api', '');

import MatchSetupModal from './MatchSetupModal';
import SelectPlayerModal from './SelectPlayerModal';
import SettingsModal from './SettingsModal';
import EndMatchModal from './EndMatchModal';
import WicketModal from './WicketModal';
import ExtraRunsModal from './ExtraRunsModal';
import LiveScorecardModal from './LiveScorecardModal';

export default function ScorerScreen() {
    const { matchId } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);

    const [perms, setPerms] = useState({
        view: true,
        add: true,
        edit: true,
        delete: true
    });

    // Theme Colors for CricHeroes Dark Scorer Mode
    const bgColor = '#0F172A';
    const cardColor = '#1E293B';
    const textColor = '#F8FAFC';
    const accentColor = '#38BDF8';
    const greenColor = '#22C55E';
    const redColor = '#EF4444';
    const goldColor = '#F59E0B';

    // Modals
    const [setupVisible, setSetupVisible] = useState(false);
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [endMatchVisible, setEndMatchVisible] = useState(false);
    const [scorecardVisible, setScorecardVisible] = useState(false);
    const [bowlerSelectionVisible, setBowlerSelectionVisible] = useState(false);
    const [wicketModalVisible, setWicketModalVisible] = useState(false);
    const [extraModalType, setExtraModalType] = useState<'WD' | 'NB' | 'BYE' | 'LB' | null>(null);
    const [inningsTransitionVisible, setInningsTransitionVisible] = useState(false);

    // Settings
    const [settings, setSettings] = useState({
        rebowlWideOrNoBall: true
    });

    // Match live state
    const [matchState, setMatchState] = useState({
        score: 0,
        wickets: 0,
        overs: 0,
        balls: 0,
        currentOver: 0,
        currentBall: 0,
        innings: 1,
        strikerId: 0,
        nonStrikerId: 0,
        bowlerId: 0,
        innings1Score: 0,
        innings1Wickets: 0,
        target: 0,
        ballsInCurrentOver: [] as any[],
        strikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        nonStrikerStats: { runs: 0, balls: 0, fours: 0, sixes: 0 },
        bowlerStats: { runs: 0, wkts: 0, balls: 0, maidens: 0 }
    });

    useEffect(() => {
        AuthService.getUser().then(user => {
            if (user) {
                setPerms({
                    view: AuthService.hasPermission(user, 'cricket_scoring', 'view'),
                    add: AuthService.hasPermission(user, 'cricket_scoring', 'add'),
                    edit: AuthService.hasPermission(user, 'cricket_scoring', 'edit'),
                    delete: AuthService.hasPermission(user, 'cricket_scoring', 'delete'),
                });
            }
        });
    }, []);

    const calculateState = (matchData: any) => {
        if (!matchData?.ball_events) return;

        const innings = matchData.current_innings || 1;
        const sId = matchData.current_striker_id;
        const nsId = matchData.current_non_striker_id;
        const bId = matchData.current_bowler_id;

        let score = 0, wickets = 0, validBalls = 0;
        let innings1Score = 0, innings1Wickets = 0;
        let strikerStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
        let nonStrikerStats = { runs: 0, balls: 0, fours: 0, sixes: 0 };
        let bowlerStats = { runs: 0, wkts: 0, balls: 0, maidens: 0 };

        matchData.ball_events.forEach((ball: any) => {
            const runs = Number(ball.runs_scored) || 0;
            const extras = Number(ball.extras) || 0;

            if (ball.innings === 1) {
                innings1Score += runs + extras;
                if (ball.is_wicket) innings1Wickets++;
            }

            if (ball.innings !== innings) return;

            score += runs + extras;
            if (ball.is_wicket) wickets++;
            if (ball.is_valid_ball) validBalls++;

            // Live striker stats
            if (ball.striker_id === sId) {
                strikerStats.runs += runs;
                if (ball.extra_type !== 'WD' && ball.extra_type !== 'WIDE') strikerStats.balls++;
                if (runs === 4) strikerStats.fours++;
                if (runs === 6) strikerStats.sixes++;
            } else if (ball.striker_id === nsId) {
                nonStrikerStats.runs += runs;
                if (ball.extra_type !== 'WD' && ball.extra_type !== 'WIDE') nonStrikerStats.balls++;
                if (runs === 4) nonStrikerStats.fours++;
                if (runs === 6) nonStrikerStats.sixes++;
            }

            // Live bowler stats
            if (ball.bowler_id === bId) {
                const isWide = ball.extra_type === 'WD' || ball.extra_type === 'WIDE';
                const isNoBall = ball.extra_type === 'NB' || ball.extra_type === 'NOBALL';
                const bowlerCost = runs + (isWide || isNoBall ? extras : 0);
                bowlerStats.runs += bowlerCost;
                if (ball.is_wicket && ball.wicket_type !== 'RUN_OUT') bowlerStats.wkts++;
                if (ball.is_valid_ball && !isWide && !isNoBall) bowlerStats.balls++;
            }
        });

        // Current over balls
        const currentOverNumber = Math.floor(validBalls / 6);
        const currentBallInOver = validBalls % 6;
        const ballsInCurrentOver = matchData.ball_events
            .filter((b: any) => b.innings === innings && b.over_number === currentOverNumber)
            .map((b: any) => ({
                runs: b.runs_scored,
                isWicket: b.is_wicket,
                extraType: b.extra_type
            }));

        const target = innings === 2 ? innings1Score + 1 : 0;
        const oversDisplay = `${currentOverNumber}.${currentBallInOver}`;

        setMatchState(prev => ({
            ...prev,
            score,
            wickets,
            overs: parseFloat(oversDisplay),
            balls: validBalls,
            currentOver: currentOverNumber,
            currentBall: currentBallInOver,
            innings,
            strikerId: sId,
            nonStrikerId: nsId,
            bowlerId: bId,
            innings1Score,
            innings1Wickets,
            target,
            ballsInCurrentOver,
            strikerStats,
            nonStrikerStats,
            bowlerStats
        }));
    };

    const loadMatch = async (skipLoader = false) => {
        try {
            if (!skipLoader) setLoading(true);
            const data = await apiService.getMatchById(Number(matchId), { skipLoader });
            setMatch(data);

            if (data.status === 'SCHEDULED' && (!data.ball_events || data.ball_events.length === 0)) {
                setSetupVisible(true);
            } else {
                calculateState(data);
            }
        } catch (error) {
            console.error('Failed to load match:', error);
            Alert.alert('Error', 'Failed to load match details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (matchId) {
            loadMatch();
            const socket = io(API_URL);
            socketRef.current = socket;
            socket.on('connect', () => socket.emit('join_match', matchId));
            socket.on('score_update', () => loadMatch(true));
            return () => {
                socket.emit('leave_match', matchId);
                socket.disconnect();
                socketRef.current = null;
            };
        } else {
            setLoading(false);
        }
    }, [matchId]);

    const handleMatchStart = async (data: any) => {
        try {
            let battingTeamId;
            if (data.tossDecision === 'BAT') {
                battingTeamId = data.tossWinnerId;
            } else {
                battingTeamId = (data.tossWinnerId === match.team_a_id) ? match.team_b_id : match.team_a_id;
            }

            await apiService.updateMatch(Number(matchId), {
                status: 'LIVE',
                toss_winner_id: data.tossWinnerId,
                toss_decision: data.tossDecision,
                current_innings: 1,
                current_batting_team_id: battingTeamId,
                current_striker_id: data.strikerId,
                current_non_striker_id: data.nonStrikerId,
                current_bowler_id: data.bowlerId,
            });

            setSetupVisible(false);
            loadMatch();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to start match');
        }
    };

    // Helper to get active batting and bowling teams
    const getBattingTeamId = () => {
        if (!match) return 0;
        if (match.current_batting_team_id) return match.current_batting_team_id;

        let isTeamABatting = false;
        if (match.toss_decision === 'BAT') {
            isTeamABatting = match.toss_winner_id === match.team_a_id;
        } else {
            isTeamABatting = match.toss_winner_id !== match.team_a_id;
        }
        if (matchState.innings === 2) isTeamABatting = !isTeamABatting;
        return isTeamABatting ? match?.team_a_id : match?.team_b_id;
    };

    const battingTeamId = getBattingTeamId();
    const bowlingTeamId = battingTeamId === match?.team_a_id ? match?.team_b_id : match?.team_a_id;

    const formatPlayers = (players: any[]) => players?.map((p: any) => ({
        id: p.user?.id || p.id,
        name: p.user?.name || p.name || 'Player'
    })) || [];

    const battingTeamPlayers = formatPlayers(battingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);
    const bowlingTeamPlayers = formatPlayers(bowlingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);

    // List of batsmen who have already been dismissed in this innings
    const getDismissedPlayerIds = () => {
        if (!match?.ball_events) return [];
        return match.ball_events
            .filter((b: any) => b.innings === matchState.innings && b.is_wicket)
            .map((b: any) => b.striker_id);
    };

    const dismissedPlayerIds = getDismissedPlayerIds();
    const availableIncomingBatsmen = battingTeamPlayers.filter(p =>
        p.id !== matchState.strikerId &&
        p.id !== matchState.nonStrikerId &&
        !dismissedPlayerIds.includes(p.id)
    );

    // Record Ball Event
    const handleBall = async (runsScored: number, extraType?: string, isWicket?: boolean, wicketType?: string, customNewStrikerId?: number) => {
        try {
            if (!matchState.strikerId || !matchState.bowlerId) {
                Alert.alert('Selection Missing', 'Striker and Bowler must be selected first.');
                return;
            }

            const ballValid = (extraType !== 'WD' && extraType !== 'NB') || !settings.rebowlWideOrNoBall;
            const extrasAmount = extraType ? (runsScored === 0 ? 1 : runsScored) : 0;
            const actualRuns = extraType === 'WD' || extraType === 'NB' ? 0 : runsScored;

            const payload = {
                match_id: match.id,
                innings: matchState.innings,
                over_number: matchState.currentOver,
                ball_number: matchState.currentBall + 1,
                bowler_id: matchState.bowlerId,
                striker_id: matchState.strikerId,
                non_striker_id: matchState.nonStrikerId,
                batting_team_id: battingTeamId,
                runs_scored: actualRuns,
                is_wicket: isWicket || false,
                wicket_type: wicketType,
                extras: extrasAmount,
                extra_type: extraType,
                is_valid_ball: ballValid
            };

            await apiService.recordBallEvent(match.id, payload);

            // Calculate new score after this ball
            const addedTotal = actualRuns + extrasAmount;
            const updatedScore = matchState.score + addedTotal;
            const updatedWickets = isWicket ? matchState.wickets + 1 : matchState.wickets;

            // Chasing Target Check in 2nd Innings
            if (matchState.innings === 2 && matchState.target > 0) {
                if (updatedScore >= matchState.target) {
                    const batTeamName = battingTeamId === match.team_a_id ? match.team_a.name : match.team_b.name;
                    const remainingWickets = Math.max(1, battingTeamPlayers.length - 1 - updatedWickets);
                    const desc = `${batTeamName} won by ${remainingWickets} wickets!`;

                    await apiService.updateMatch(match.id, {
                        status: 'COMPLETED',
                        is_completed: true,
                        winning_team_id: battingTeamId,
                        result_description: desc
                    });

                    Alert.alert('Match Finished! 🏆', desc, [
                        { text: 'View Scorecard', onPress: () => router.replace({ pathname: '/(tabs)/scoring/analytics/[id]', params: { id: match.id } }) }
                    ]);
                    return;
                }
            }

            // Striker rotation on odd runs scored from the bat or byes
            let currentS = matchState.strikerId;
            let currentNS = matchState.nonStrikerId;

            if (runsScored % 2 !== 0) {
                const temp = currentS;
                currentS = currentNS;
                currentNS = temp;
            }

            // If wicket fell and a new batsman was selected
            if (isWicket && customNewStrikerId) {
                currentS = customNewStrikerId;
            }

            // End of Over check (6 legal balls bowled)
            const isEndOfOver = ballValid && matchState.currentBall === 5;
            if (isEndOfOver) {
                // Striker swap ends at over completion (Standard Cricket Rule!)
                const temp = currentS;
                currentS = currentNS;
                currentNS = temp;

                // Check if maximum match overs reached
                const nextOverNum = matchState.currentOver + 1;
                if (match.overs && nextOverNum >= match.overs) {
                    if (matchState.innings === 1) {
                        Alert.alert(
                            '1st Innings Complete! 🏁',
                            `1st Innings score: ${updatedScore}/${updatedWickets}. Target for 2nd Innings: ${updatedScore + 1}`,
                            [
                                { text: 'Start 2nd Innings', onPress: () => handleStartSecondInnings(updatedScore) }
                            ]
                        );
                    } else {
                        // 2nd Innings overs complete
                        handleMatchOversFinished(updatedScore);
                    }
                    return;
                } else {
                    // Over complete, prompt bowler selection
                    setBowlerSelectionVisible(true);
                }
            }

            // Update match pointers in DB
            await apiService.updateMatch(Number(matchId), {
                current_striker_id: currentS,
                current_non_striker_id: currentNS,
            });

            loadMatch(true);

        } catch (error: any) {
            console.error('Error recording ball:', error);
            Alert.alert('Error', error.message || 'Failed to record ball');
        }
    };

    // Transition from 1st Innings to 2nd Innings
    const handleStartSecondInnings = async (innings1FinalScore: number) => {
        try {
            const nextBattingTeamId = bowlingTeamId; // Team that bowled first now bats
            const nextBowlingTeamId = battingTeamId; // Team that batted first now bowls

            const nextBattingPlayers = formatPlayers(nextBattingTeamId === match.team_a_id ? match.team_a.players : match.team_b.players);
            const nextBowlingPlayers = formatPlayers(nextBowlingTeamId === match.team_a_id ? match.team_a.players : match.team_b.players);

            if (nextBattingPlayers.length < 2 || nextBowlingPlayers.length < 1) {
                Alert.alert('Squad Incomplete', 'Both teams must have at least 2 batsmen and 1 bowler.');
                return;
            }

            const newStriker = nextBattingPlayers[0].id;
            const newNonStriker = nextBattingPlayers[1].id;
            const newBowler = nextBowlingPlayers[0].id;

            await apiService.updateMatch(Number(matchId), {
                current_innings: 2,
                current_batting_team_id: nextBattingTeamId,
                current_striker_id: newStriker,
                current_non_striker_id: newNonStriker,
                current_bowler_id: newBowler
            });

            Alert.alert(
                '2nd Innings Started! 🏏',
                `Target: ${innings1FinalScore + 1} runs. Opening batsmen and bowler set automatically. You can change them anytime.`
            );

            loadMatch();
        } catch (e: any) {
            console.error("Failed to start 2nd innings:", e);
            Alert.alert('Error', 'Failed to transition to 2nd innings');
        }
    };

    const handleMatchOversFinished = async (finalScore: number) => {
        const target = matchState.target;
        let desc = 'Match Finished!';
        let winTeamId = null;

        if (finalScore >= target) {
            winTeamId = battingTeamId;
            const batName = battingTeamId === match.team_a_id ? match.team_a.name : match.team_b.name;
            desc = `${batName} won by ${battingTeamPlayers.length - 1 - matchState.wickets} wickets!`;
        } else if (finalScore === target - 1) {
            desc = 'Match Tied!';
        } else {
            winTeamId = bowlingTeamId;
            const bowlName = bowlingTeamId === match.team_a_id ? match.team_a.name : match.team_b.name;
            desc = `${bowlName} won by ${target - 1 - finalScore} runs!`;
        }

        await apiService.updateMatch(Number(matchId), {
            status: 'COMPLETED',
            is_completed: true,
            winning_team_id: winTeamId,
            result_description: desc
        });

        Alert.alert('Match Completed! 🏆', desc, [
            { text: 'View Full Scorecard', onPress: () => router.replace({ pathname: '/(tabs)/scoring/analytics/[id]', params: { id: match.id } }) }
        ]);
    };

    const handleFinishMatch = async (result: any) => {
        try {
            await apiService.updateMatch(Number(matchId), {
                status: 'COMPLETED',
                is_completed: true,
                winning_team_id: result.winning_team_id === '0' ? null : Number(result.winning_team_id),
                man_of_the_match_id: result.man_of_the_match_id ? Number(result.man_of_the_match_id) : null,
                result_description: result.winning_team_id === '0'
                    ? 'Match Tied / Drawn'
                    : `${Number(result.winning_team_id) === match.team_a_id ? match.team_a.name : match.team_b.name} Won`
            });
            setEndMatchVisible(false);
            router.replace({ pathname: '/(tabs)/scoring/analytics/[id]', params: { id: matchId } });
        } catch (error) {
            Alert.alert('Error', 'Failed to end match');
        }
    };

    const handleUndo = async () => {
        try {
            await apiService.undoLastBall(Number(matchId));
            loadMatch();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to undo ball');
        }
    };

    const getPlayerName = (id: number) => {
        if (!id || id === 0) return 'Not Selected';
        if (!match) return '...';
        const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
        const p = allPlayers.find((p: any) => (p.user?.id || p.user_id || p.id) === id);
        return p?.user?.name || p?.name || 'Unknown';
    };

    if (loading) return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={{ color: textColor, marginTop: 12 }}>Loading match data...</Text>
        </SafeAreaView>
    );

    if (!matchId || (!match && !loading)) return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
            <Text style={{ color: textColor, marginBottom: 12, fontSize: 16 }}>Match not found (ID: {matchId || 'None'})</Text>
            <Button mode="contained" buttonColor={accentColor} textColor="black" onPress={() => router.canGoBack() ? router.back() : router.replace('/management/cricket/matches')}>
                Go to Matches
            </Button>
        </SafeAreaView>
    );

    const runRate = matchState.balls > 0 ? ((matchState.score / matchState.balls) * 6).toFixed(2) : "0.00";
    const battingTeamName = battingTeamId === match?.team_a_id ? match?.team_a?.name : match?.team_b?.name;
    const bowlingTeamName = bowlingTeamId === match?.team_a_id ? match?.team_a?.name : match?.team_b?.name;

    const remainingRuns = matchState.innings === 2 ? Math.max(0, matchState.target - matchState.score) : 0;
    const remainingBalls = matchState.innings === 2 ? Math.max(0, (match.overs * 6) - matchState.balls) : 0;
    const requiredRunRate = remainingBalls > 0 ? ((remainingRuns / remainingBalls) * 6).toFixed(2) : "0.00";

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header */}
            <Appbar.Header style={{ backgroundColor: bgColor }} elevated={false}>
                <Appbar.BackAction color={textColor} onPress={() => router.canGoBack() ? router.back() : router.replace('/management/cricket/matches')} />
                <Appbar.Content
                    title={match?.tournament?.name || 'Cricket Match'}
                    subtitle={`${match.status} • Innings ${matchState.innings}`}
                    titleStyle={{ color: textColor, fontWeight: 'bold', fontSize: 16 }}
                    subtitleStyle={{ color: '#94A3B8', fontSize: 11 }}
                />
                <Appbar.Action icon="poll" color={goldColor} onPress={() => setScorecardVisible(true)} />
                <Appbar.Action icon="undo" color={textColor} onPress={handleUndo} disabled={!perms.delete} />
                <Appbar.Action icon="cog" color={textColor} onPress={() => setSettingsVisible(true)} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Scoreboard Card */}
                <Card style={[styles.scoreCard, { backgroundColor: cardColor }]}>
                    <Card.Content style={styles.scoreContent}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ color: textColor, fontSize: 44, fontWeight: 'bold' }}>
                                    {matchState.score}-{matchState.wickets}
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 20, marginLeft: 10 }}>
                                    ({matchState.overs}/{match.overs})
                                </Text>
                            </View>
                            <Text style={{ color: accentColor, fontWeight: 'bold', fontSize: 16 }}>
                                🏏 {battingTeamName}
                            </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end' }}>
                            <Chip style={{ backgroundColor: '#334155', marginBottom: 4 }} textStyle={{ color: '#F8FAFC', fontSize: 11, fontWeight: 'bold' }}>
                                CRR: {runRate}
                            </Chip>

                            {matchState.innings === 2 ? (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ color: goldColor, fontSize: 13, fontWeight: 'bold' }}>Target: {matchState.target}</Text>
                                    <Text style={{ color: '#94A3B8', fontSize: 11 }}>Need {remainingRuns} in {remainingBalls}b</Text>
                                    <Text style={{ color: '#38BDF8', fontSize: 11 }}>RRR: {requiredRunRate}</Text>
                                </View>
                            ) : (
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>1st Innings</Text>
                            )}
                        </View>
                    </Card.Content>
                </Card>

                {/* Over Summary */}
                <View style={styles.overSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 }}>THIS OVER</Text>
                        <Text style={{ color: '#94A3B8', fontSize: 11 }}>Over {matchState.currentOver + 1} of {match.overs}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overSummary}>
                        {matchState.ballsInCurrentOver.map((b, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.ballCircle,
                                    b.isWicket && { backgroundColor: redColor },
                                    (b.extraType === 'WD' || b.extraType === 'NB') && { backgroundColor: goldColor },
                                    (b.runs === 4 || b.runs === 6) && { backgroundColor: greenColor }
                                ]}
                            >
                                <Text style={{ color: (b.runs === 4 || b.runs === 6 || b.isWicket || b.extraType) ? 'white' : '#F8FAFC', fontWeight: 'bold', fontSize: 12 }}>
                                    {b.isWicket ? 'W' : (b.extraType ? b.extraType : b.runs)}
                                </Text>
                            </View>
                        ))}
                        {matchState.ballsInCurrentOver.length === 0 && <Text style={{ color: '#64748B', fontSize: 12, fontStyle: 'italic' }}>New over starting...</Text>}
                    </ScrollView>
                </View>

                {/* Live Pitch Players Section */}
                <Card style={[styles.statsCard, { backgroundColor: cardColor }]}>
                    <Card.Content>
                        {/* Batsmen */}
                        <View style={styles.playerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor, fontWeight: 'bold', fontSize: 14 }}>
                                    🏏 {getPlayerName(matchState.strikerId)} <Text style={{ color: accentColor }}>*</Text>
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                                    {matchState.strikerStats.runs} ({matchState.strikerStats.balls}b) • 4s: {matchState.strikerStats.fours} • 6s: {matchState.strikerStats.sixes}
                                </Text>
                            </View>

                            <IconButton
                                icon="swap-horizontal"
                                iconColor={accentColor}
                                size={22}
                                disabled={!perms.edit}
                                onPress={async () => {
                                    const newStriker = matchState.nonStrikerId;
                                    const newNonStriker = matchState.strikerId;
                                    setMatchState(prev => ({ ...prev, strikerId: newStriker, nonStrikerId: newNonStriker }));
                                    await apiService.updateMatch(Number(matchId), {
                                        current_striker_id: newStriker,
                                        current_non_striker_id: newNonStriker
                                    });
                                }}
                            />

                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={{ color: '#CBD5E1', fontSize: 14 }}>
                                    {getPlayerName(matchState.nonStrikerId)}
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                                    {matchState.nonStrikerStats.runs} ({matchState.nonStrikerStats.balls}b) • 4s: {matchState.nonStrikerStats.fours} • 6s: {matchState.nonStrikerStats.sixes}
                                </Text>
                            </View>
                        </View>

                        <Divider style={{ marginVertical: 10, backgroundColor: '#334155' }} />

                        {/* Bowler */}
                        <View style={styles.playerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor, fontSize: 14 }}>
                                    🥎 {getPlayerName(matchState.bowlerId)} ({bowlingTeamName})
                                </Text>
                                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                                    {matchState.bowlerStats.wkts}-{matchState.bowlerStats.runs} ({Math.floor(matchState.bowlerStats.balls / 6)}.{matchState.bowlerStats.balls % 6} ov)
                                </Text>
                            </View>
                            <Button
                                mode="outlined"
                                compact
                                textColor={accentColor}
                                style={{ borderColor: '#334155' }}
                                onPress={() => setBowlerSelectionVisible(true)}
                                disabled={!perms.edit}
                            >
                                Change
                            </Button>
                        </View>
                    </Card.Content>
                </Card>

                {/* Keypad Controls */}
                <View style={styles.controls}>
                    {/* Runs Pad */}
                    <View style={styles.buttonGrid}>
                        {[0, 1, 2, 3, 4, 6].map(run => (
                            <TouchableOpacity
                                key={run}
                                style={[
                                    styles.runBtn,
                                    run === 4 && { backgroundColor: '#0284C7' },
                                    run === 6 && { backgroundColor: greenColor },
                                    run !== 4 && run !== 6 && { backgroundColor: '#334155' },
                                    (!perms.add || matchState.currentBall >= 6) && { opacity: 0.5 }
                                ]}
                                onPress={() => perms.add && handleBall(run)}
                                disabled={!perms.add || matchState.currentBall >= 6}
                            >
                                <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>{run}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Action Buttons: Wicket & Extras */}
                    <View style={styles.row}>
                        <Button
                            mode="contained"
                            buttonColor={redColor}
                            textColor="white"
                            labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                            onPress={() => setWicketModalVisible(true)}
                            style={styles.actionBtn}
                            disabled={!perms.add || matchState.currentBall >= 6}
                        >
                            💥 WICKET
                        </Button>
                        <Button
                            mode="outlined"
                            textColor={goldColor}
                            labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                            onPress={() => setExtraModalType('WD')}
                            style={[styles.actionBtn, { borderColor: goldColor }]}
                            disabled={!perms.add}
                        >
                            WIDE
                        </Button>
                        <Button
                            mode="outlined"
                            textColor={goldColor}
                            labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
                            onPress={() => setExtraModalType('NB')}
                            style={[styles.actionBtn, { borderColor: goldColor }]}
                            disabled={!perms.add}
                        >
                            NO BALL
                        </Button>
                    </View>

                    <View style={styles.row}>
                        <Button
                            mode="text"
                            textColor="#94A3B8"
                            labelStyle={{ fontSize: 11 }}
                            onPress={() => setExtraModalType('BYE')}
                            style={styles.actionBtn}
                            disabled={!perms.add || matchState.currentBall >= 6}
                        >
                            BYE
                        </Button>
                        <Button
                            mode="text"
                            textColor="#94A3B8"
                            labelStyle={{ fontSize: 11 }}
                            onPress={() => setExtraModalType('LB')}
                            style={styles.actionBtn}
                            disabled={!perms.add || matchState.currentBall >= 6}
                        >
                            LEG BYE
                        </Button>
                        <Button
                            mode="text"
                            textColor={accentColor}
                            labelStyle={{ fontSize: 11 }}
                            onPress={() => setSetupVisible(true)}
                            style={styles.actionBtn}
                            disabled={!perms.edit}
                        >
                            SETUP
                        </Button>
                    </View>

                    {/* Innings Switcher / Finisher */}
                    {matchState.innings === 1 && (
                        <Button
                            mode="contained-tonal"
                            icon="swap-vertical"
                            onPress={() => {
                                Alert.alert(
                                    'End 1st Innings?',
                                    `Current 1st innings score: ${matchState.score}/${matchState.wickets}. Ready to start 2nd innings?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Start 2nd Innings', onPress: () => handleStartSecondInnings(matchState.score) }
                                    ]
                                );
                            }}
                            style={{ marginTop: 8 }}
                        >
                            End 1st Innings (Target: {matchState.score + 1})
                        </Button>
                    )}

                    {matchState.innings === 2 && (
                        <Button
                            mode="contained"
                            buttonColor="#D97706"
                            textColor="white"
                            icon="flag-checkered"
                            onPress={() => setEndMatchVisible(true)}
                            style={{ marginTop: 8 }}
                        >
                            Finish & Declare Result
                        </Button>
                    )}
                </View>

                {/* Modals */}
                {match && (
                    <MatchSetupModal
                        visible={setupVisible}
                        onDismiss={() => setSetupVisible(false)}
                        teamA={match.team_a}
                        teamB={match.team_b}
                        onStart={handleMatchStart}
                        initialData={match}
                    />
                )}

                {/* Next Bowler Selection */}
                <SelectPlayerModal
                    visible={bowlerSelectionVisible}
                    onDismiss={() => setBowlerSelectionVisible(false)}
                    title="Select Next Bowler"
                    players={bowlingTeamPlayers.filter(p => p.id !== matchState.bowlerId)}
                    onSelect={async (p) => {
                        setMatchState(prev => ({ ...prev, bowlerId: p.id }));
                        setBowlerSelectionVisible(false);
                        await apiService.updateMatch(Number(matchId), { current_bowler_id: p.id });
                    }}
                />

                {/* Wicket Modal */}
                <WicketModal
                    visible={wicketModalVisible}
                    onDismiss={() => setWicketModalVisible(false)}
                    strikerName={getPlayerName(matchState.strikerId)}
                    nonStrikerName={getPlayerName(matchState.nonStrikerId)}
                    strikerId={matchState.strikerId}
                    nonStrikerId={matchState.nonStrikerId}
                    availableBatsmen={availableIncomingBatsmen}
                    onConfirm={({ wicketType, outPlayerId, newStrikerId, isAllOut }) => {
                        handleBall(0, undefined, true, wicketType, newStrikerId);
                        if (isAllOut) {
                            if (matchState.innings === 1) {
                                Alert.alert('All Out! 🏁', '1st Innings concluded. Ready to start 2nd Innings.', [
                                    { text: 'Start 2nd Innings', onPress: () => handleStartSecondInnings(matchState.score) }
                                ]);
                            } else {
                                handleMatchOversFinished(matchState.score);
                            }
                        }
                    }}
                />

                {/* Extras Modal */}
                <ExtraRunsModal
                    visible={extraModalType !== null}
                    onDismiss={() => setExtraModalType(null)}
                    extraType={extraModalType}
                    onConfirm={(runs, type) => handleBall(runs, type)}
                />

                {/* Settings Modal */}
                <SettingsModal
                    visible={settingsVisible}
                    onDismiss={() => setSettingsVisible(false)}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    onEndMatch={() => {
                        setSettingsVisible(false);
                        setEndMatchVisible(true);
                    }}
                />

                {/* End Match Modal */}
                <EndMatchModal
                    visible={endMatchVisible}
                    onDismiss={() => setEndMatchVisible(false)}
                    onEnd={handleFinishMatch}
                    teamA={match?.team_a}
                    teamB={match?.team_b}
                    players={[...(match?.team_a?.players || []), ...(match?.team_b?.players || [])].map(p => ({
                        id: p.user?.id || p.id,
                        name: p.user?.name || p.name
                    }))}
                />

                {/* Full Live Scorecard Modal */}
                <LiveScorecardModal
                    visible={scorecardVisible}
                    onDismiss={() => setScorecardVisible(false)}
                    matchId={Number(matchId)}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 30 },
    scoreCard: { marginBottom: 14, borderRadius: 16, elevation: 4 },
    scoreContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    overSection: { marginBottom: 16 },
    overSummary: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    ballCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
    statsCard: { marginBottom: 16, borderRadius: 16 },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    controls: { paddingBottom: 10 },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 12 },
    runBtn: { width: '31%', height: 58, justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 8, elevation: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    actionBtn: { flex: 1, marginHorizontal: 2, borderRadius: 8 }
});

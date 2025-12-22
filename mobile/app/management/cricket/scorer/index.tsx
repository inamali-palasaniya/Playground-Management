import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, useTheme, Card, Avatar, Divider, Appbar } from 'react-native-paper';
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

export default function ScorerScreen() {
    const { matchId } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const socketRef = React.useRef<Socket | null>(null);
    const [perms, setPerms] = useState({
        view: false,
        add: false,
        edit: false,
        delete: false
    });
    const [endMatchVisible, setEndMatchVisible] = useState(false);

    useEffect(() => {
        AuthService.getUser().then(user => {
            setPerms({
                view: AuthService.hasPermission(user, 'cricket_scoring', 'view'),
                add: AuthService.hasPermission(user, 'cricket_scoring', 'add'),
                edit: AuthService.hasPermission(user, 'cricket_scoring', 'edit'),
                delete: AuthService.hasPermission(user, 'cricket_scoring', 'delete'),
            });
        });
    }, []);

    // Theme Colors for Night Mode (Moved up for availability in early returns)
    const bgColor = '#121212';
    const cardColor = '#1e1e1e';
    const textColor = '#ffffff';
    const accentColor = '#BB86FC';

    const [setupVisible, setSetupVisible] = useState(false);

    // Settings
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [settings, setSettings] = useState({
        rebowlWideOrNoBall: true // Default: Standard Cricket
    });

    // Transition Modals
    const [bowlerSelectionVisible, setBowlerSelectionVisible] = useState(false);
    const [batsmanSelectionVisible, setBatsmanSelectionVisible] = useState(false);

    // State Derived from Match Data
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
        ballsInCurrentOver: [] as any[],
        strikerStats: { runs: 0, balls: 0 },
        nonStrikerStats: { runs: 0, balls: 0 },
        bowlerStats: { runs: 0, wkts: 0, balls: 0 }
    });

    const calculateState = (matchData: any) => {
        if (!matchData?.ball_events) return;

        let score = 0, wickets = 0, validBalls = 0;
        let strikerStats = { runs: 0, balls: 0 };
        let nonStrikerStats = { runs: 0, balls: 0 };
        let bowlerStats = { runs: 0, wkts: 0, balls: 0 };
        let ballsInCurrentOver: any[] = [];

        const innings = matchData.current_innings || 1;
        const sId = matchData.current_striker_id;
        const nsId = matchData.current_non_striker_id;
        const bId = matchData.current_bowler_id;

        matchData.ball_events.forEach((ball: any) => {
            if (ball.innings !== innings) return;

            const runs = Number(ball.runs_scored) || 0;
            const extras = Number(ball.extras) || 0;
            score += runs + extras;

            if (ball.is_wicket) wickets++;

            if (ball.is_valid_ball) validBalls++;

            // Stats for current live players
            if (ball.striker_id === sId) {
                strikerStats.runs += runs;
                if (ball.is_valid_ball) strikerStats.balls++;
            } else if (ball.striker_id === nsId) {
                nonStrikerStats.runs += runs;
                if (ball.is_valid_ball) nonStrikerStats.balls++;
            }

            if (ball.bowler_id === bId) {
                bowlerStats.runs += runs + extras;
                if (ball.is_wicket) bowlerStats.wkts++;
                if (ball.is_valid_ball) bowlerStats.balls++;
            }
        });

        // Group last few balls for current over summary
        const currentTotalBalls = validBalls;
        const currentOverNumber = Math.floor(currentTotalBalls / 6);
        ballsInCurrentOver = matchData.ball_events
            .filter((b: any) => b.innings === innings && b.over_number === currentOverNumber)
            .map((b: any) => ({
                runs: b.runs_scored,
                isWicket: b.is_wicket,
                extraType: b.extra_type
            }));

        const currentBallInOver = currentTotalBalls % 6;
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
            console.error(error);
            Alert.alert('Error', 'Failed to load match');
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

            setMatchState(prev => ({
                ...prev,
                strikerId: data.strikerId,
                nonStrikerId: data.nonStrikerId,
                bowlerId: data.bowlerId,
                currentOver: 0,
                currentBall: 0,
                innings: 1,
            }));

            setSetupVisible(false);
            loadMatch();
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to start match');
        }
    };

    const handleBall = async (runsScored: number, extraType?: string, isWicket?: boolean) => {
        try {
            if (!matchState.strikerId || !matchState.bowlerId) {
                Alert.alert('Error', 'Striker and Bowler must be selected.');
                return;
            }

            const battingTeamId = match.current_batting_team_id;
            const ballValid = (extraType !== 'WD' && extraType !== 'NB') || !settings.rebowlWideOrNoBall;

            const payload = {
                match_id: match.id,
                innings: matchState.innings,
                over_number: matchState.currentOver,
                ball_number: matchState.currentBall + 1,
                bowler_id: matchState.bowlerId,
                striker_id: matchState.strikerId,
                non_striker_id: matchState.nonStrikerId,
                batting_team_id: battingTeamId,
                runs_scored: runsScored,
                is_wicket: isWicket || false,
                extras: extraType ? (runsScored === 0 ? 1 : runsScored) : 0,
                extra_type: extraType,
                is_valid_ball: ballValid
            };

            // Validation: Check if Overs Limit Reached (Before sending?)
            // actually we check current state. If we are already at max overs, we shouldn't allow this.
            // But we might be on last ball.
            // Let's check: if (matchState.overs >= match.overs) ...
            if (match.overs && matchState.overs >= match.overs) {
                Alert.alert('Innings Ended', 'Maximum overs reached.');
                return;
            }

            // Wicket Logic Pre-Check for "All Out"
            if (isWicket) {
                const totalPlayers = battingTeamPlayers.length;
                const currentWickets = matchState.wickets + 1;
                // If only 1 player remains (who is non-striker), they can't bat alone.
                // So if wickets == totalPlayers - 1, it is All Out.
                if (currentWickets >= totalPlayers - 1) {
                    Alert.alert('All Out', 'Innings ended (All Out).');
                    // Proceed to record the wicket, but DO NOT show batsman selection.
                    // And maybe mark innings as closed in backend? 
                    // For now, we record it, but suppress the modal.
                }
            }

            await apiService.recordBallEvent(match.id, payload);

            // Automatic Striker Swap for odd runs
            if (runsScored % 2 !== 0) {
                const newStrikerId = matchState.nonStrikerId;
                const newNonStrikerId = matchState.strikerId;

                await apiService.updateMatch(Number(matchId), {
                    current_striker_id: newStrikerId,
                    current_non_striker_id: newNonStrikerId
                });
            }

            if (ballValid && matchState.currentBall === 5) {
                // Check if this was the last over
                const nextOver = matchState.currentOver + 1;
                if (match.overs && nextOver >= match.overs) {
                    Alert.alert('Innings Ended', 'Maximum overs reached.');
                    // Ends match/innings automatically or user handles it? 
                    // We just don't show bowler selection if match is over.
                } else {
                    setBowlerSelectionVisible(true);
                }
            }
            if (isWicket) {
                const totalPlayers = battingTeamPlayers.length;
                const newWickets = matchState.wickets + 1;
                // If wickets == totalPlayers - 1, we are all out.
                if (newWickets < totalPlayers - 1) {
                    setBatsmanSelectionVisible(true);
                } else {
                    // All Out - maybe notify user?
                    // Alert.alert("Innings Ended", "Team is All Out");
                }
            }

            loadMatch();

        } catch (error: any) {
            console.error(error);
            let message = 'Failed to record ball';
            if (error.body) {
                try {
                    const parsed = JSON.parse(error.body);
                    if (parsed.error) message = parsed.error;
                } catch (e) {
                    message = String(error.body);
                }
            } else if (error.message) {
                message = error.message;
            }
            Alert.alert('Validation Error', message);
        }
    };

    const handleUndo = async () => {
        try {
            await apiService.undoLastBall(Number(matchId));
            loadMatch();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to undo');
        }
    };

    if (loading) return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={{ color: textColor, marginTop: 10 }}>Loading match...</Text>
        </SafeAreaView>
    );

    if (!matchId || (!match && !loading)) return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: textColor, marginBottom: 10 }}>Match not found (ID: {matchId || 'None'})</Text>
            <Button mode="contained" buttonColor={accentColor} textColor="black" onPress={() => router.replace('/management/cricket/matches')}>
                Go to Matches
            </Button>
        </SafeAreaView>
    );

    const getPlayerName = (id: number) => {
        if (!id || id === 0) return 'Not Selected';
        if (!match) return '...';
        const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
        const p = allPlayers.find((p: any) => p.user?.id === id || p.user_id === id || p.id === id);
        return p?.user?.name || p?.name || 'Unknown';
    };

    const getBattingTeamId = () => {
        if (!match) return 0;
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
        name: p.user?.name || 'Player'
    })) || [];

    const battingTeamPlayers = formatPlayers(battingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);
    const bowlingTeamPlayers = formatPlayers(bowlingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);

    const runRate = matchState.balls > 0 ? ((matchState.score / matchState.balls) * 6).toFixed(2) : "0.00";

    const handleFinishMatch = async (result: any) => {
        try {
            await apiService.updateMatch(Number(matchId), {
                status: 'COMPLETED',
                is_completed: true,
                winning_team_id: result.winning_team_id === '0' ? null : result.winning_team_id,
                man_of_the_match_id: result.man_of_the_match_id,
                result_description: result.winning_team_id === '0'
                    ? 'Match Drawn'
                    : `${result.winning_team_id === match.team_a_id ? match.team_a.name : match.team_b.name} Won`
            });
            setEndMatchVisible(false);
            router.replace({ pathname: '/management/cricket/analytics/[id]', params: { id: matchId } });
        } catch (error) {
            Alert.alert('Error', 'Failed to end match');
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
            <Appbar.Header style={{ backgroundColor: bgColor }} elevated={false}>
                <Appbar.BackAction color={textColor} onPress={() => router.replace('/management/cricket')} />
                <Appbar.Content title="Live Scorer" titleStyle={{ color: textColor }} />
                <Appbar.Action icon="undo" color={textColor} onPress={handleUndo} disabled={!perms.delete} />
                <Appbar.Action icon="cog" color={textColor} onPress={() => setSettingsVisible(true)} />
            </Appbar.Header>

            <View style={{ flex: 1, paddingHorizontal: 16 }}>
                {/* Scoreboard */}
                <Card style={[styles.scoreCard, { backgroundColor: cardColor }]}>
                    <Card.Content style={styles.scoreContent}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={{ color: textColor, fontSize: 42, fontWeight: 'bold' }}>
                                    {matchState.score}-{matchState.wickets}
                                </Text>
                                <Text style={{ color: 'gray', fontSize: 18, marginLeft: 10 }}>
                                    ({matchState.overs})
                                </Text>
                            </View>
                            <Text style={{ color: accentColor, fontWeight: 'bold' }}>
                                {match?.team_a?.id === battingTeamId ? match?.team_a?.name : match?.team_b?.name}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: 'gray', fontSize: 12 }}>CRR</Text>
                            <Text style={{ color: textColor, fontSize: 18, fontWeight: 'bold' }}>{runRate}</Text>
                            <Text style={{ color: 'gray', fontSize: 10, marginTop: 5 }}>Target: --</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Over Summary */}
                <View style={styles.overSection}>
                    <Text style={{ color: 'gray', fontSize: 12, marginBottom: 8 }}>THIS OVER</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.overSummary}>
                        {matchState.ballsInCurrentOver.map((b, i) => (
                            <View key={i} style={[styles.ballCircle, b.isWicket && { backgroundColor: '#CF6679' }, b.extraType && { backgroundColor: '#03DAC6' }]}>
                                <Text style={{ color: b.isWicket || b.extraType ? 'black' : 'white', fontWeight: 'bold', fontSize: 12 }}>
                                    {b.isWicket ? 'W' : (b.extraType ? b.extraType : b.runs)}
                                </Text>
                            </View>
                        ))}
                        {matchState.ballsInCurrentOver.length === 0 && <Text style={{ color: 'gray', fontSize: 12 }}>Wait for ball...</Text>}
                    </ScrollView>
                </View>

                {/* Players Section */}
                <Card style={[styles.statsCard, { backgroundColor: cardColor }]}>
                    <Card.Content>
                        <View style={styles.playerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor, fontWeight: 'bold' }}>🏏 {getPlayerName(matchState.strikerId)} *</Text>
                                <Text style={{ color: 'gray', fontSize: 12 }}>{matchState.strikerStats.runs} ({matchState.strikerStats.balls})</Text>
                            </View>
                            <IconButton
                                icon="swap-horizontal"
                                iconColor="gray"
                                size={18}
                                disabled={!perms.edit}
                                onPress={async () => {
                                    const newStrikerId = matchState.nonStrikerId;
                                    const newNonStrikerId = matchState.strikerId;
                                    setMatchState(prev => ({ ...prev, strikerId: newStrikerId, nonStrikerId: newNonStrikerId }));
                                    try {
                                        await apiService.updateMatch(Number(matchId), {
                                            current_striker_id: newStrikerId,
                                            current_non_striker_id: newNonStrikerId
                                        });
                                    } catch (e) {
                                        console.error("Failed to persist striker swap", e);
                                    }
                                }}
                            />
                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                <Text style={{ color: 'gray' }}>🏏 {getPlayerName(matchState.nonStrikerId)}</Text>
                                <Text style={{ color: 'gray', fontSize: 12 }}>{matchState.nonStrikerStats.runs} ({matchState.nonStrikerStats.balls})</Text>
                            </View>
                        </View>
                        <Divider style={{ marginVertical: 12, backgroundColor: '#333' }} />
                        <View style={styles.playerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: textColor }}>🥎 {getPlayerName(matchState.bowlerId)}</Text>
                                <Text style={{ color: 'gray', fontSize: 12 }}>
                                    {matchState.bowlerStats.wkts}-{matchState.bowlerStats.runs} ({Math.floor(matchState.bowlerStats.balls / 6)}.{matchState.bowlerStats.balls % 6})
                                </Text>
                            </View>
                            <Button mode="text" compact labelStyle={{ color: accentColor }} onPress={() => setBowlerSelectionVisible(true)} disabled={!perms.edit}>Change</Button>
                        </View>
                    </Card.Content>
                </Card>

                {/* Control Pad */}
                <View style={styles.controls}>
                    <View style={styles.buttonGrid}>
                        {[0, 1, 2, 3, 4, 6].map(run => (
                            <TouchableOpacity
                                key={run}
                                style={[styles.runBtn, { backgroundColor: run === 4 || run === 6 ? '#03DAC6' : '#333', opacity: !perms.add ? 0.5 : 1 }]}
                                onPress={() => perms.add && handleBall(run)}
                                disabled={!perms.add}
                            >
                                <Text style={{ fontSize: 22, color: run === 4 || run === 6 ? 'black' : 'white', fontWeight: 'bold' }}>{run}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.row}>
                        <Button mode="contained" buttonColor="#CF6679" labelStyle={{ fontSize: 11 }} onPress={() => handleBall(0, undefined, true)} style={styles.actionBtn} disabled={!perms.add}>WICKET</Button>
                        <Button mode="outlined" textColor="#BB86FC" labelStyle={{ fontSize: 11 }} onPress={() => handleBall(0, 'WD')} style={styles.actionBtn} disabled={!perms.add}>WIDE</Button>
                        <Button mode="outlined" textColor="#BB86FC" labelStyle={{ fontSize: 11 }} onPress={() => handleBall(0, 'NB')} style={styles.actionBtn} disabled={!perms.add}>NO BALL</Button>
                    </View>
                    <View style={styles.row}>
                        <Button mode="text" textColor="gray" labelStyle={{ fontSize: 11 }} onPress={() => handleBall(0, 'BYE')} style={styles.actionBtn} disabled={!perms.add}>BYE</Button>
                        <Button mode="text" textColor="gray" labelStyle={{ fontSize: 11 }} onPress={() => handleBall(0, 'LB')} style={styles.actionBtn} disabled={!perms.add}>LEG BYE</Button>
                        <Button mode="text" textColor="orange" labelStyle={{ fontSize: 11 }} onPress={() => setSetupVisible(true)} style={styles.actionBtn} disabled={!perms.edit}>SETUP</Button>
                    </View>
                </View>

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

                <SelectPlayerModal
                    visible={bowlerSelectionVisible}
                    onDismiss={() => setBowlerSelectionVisible(false)}
                    title="Select Next Bowler"
                    players={bowlingTeamPlayers.filter(p => p.id !== matchState.bowlerId)}
                    onSelect={async (p) => {
                        // Validate Bowler Team
                        const battingTeamId = match?.current_batting_team_id;
                        if (battingTeamId) {
                            const battingTeam = battingTeamId === match?.team_a_id ? match?.team_a : match?.team_b;
                            const isInBatting = battingTeam?.players?.find((bp: any) => (bp.user?.id || bp.id) === p.id);
                            if (isInBatting) {
                                Alert.alert('Invalid Bowler', 'Bowler cannot be from the batting team.');
                                return;
                            }
                        }

                        setMatchState(prev => ({ ...prev, bowlerId: p.id }));
                        setBowlerSelectionVisible(false);
                        try {
                            await apiService.updateMatch(Number(matchId), {
                                current_bowler_id: p.id
                            });
                        } catch (e: any) {
                            console.error("Failed to persist bowler change", e);
                            Alert.alert('Error', e.body ? JSON.parse(e.body).error : 'Failed to update bowler');
                        }
                    }}
                />

                <SelectPlayerModal
                    visible={batsmanSelectionVisible}
                    onDismiss={() => setBatsmanSelectionVisible(false)}
                    title="Select New Batsman"
                    // Filter out existing striker/non-striker just in case
                    players={battingTeamPlayers.filter(p => p.id !== matchState.strikerId && p.id !== matchState.nonStrikerId)}
                    onSelect={async (p) => {
                        // Validate Striker != NonStriker
                        if (p.id === matchState.nonStrikerId) {
                            Alert.alert('Invalid Selection', 'Striker cannot be the same as Non-Striker.');
                            return;
                        }

                        setMatchState(prev => ({ ...prev, strikerId: p.id }));
                        setBatsmanSelectionVisible(false);
                        try {
                            await apiService.updateMatch(Number(matchId), {
                                current_striker_id: p.id
                            });
                        } catch (e: any) {
                            console.error("Failed to persist batsman change", e);
                            Alert.alert('Error', e.body ? JSON.parse(e.body).error : 'Failed to update batsman');
                        }
                    }}
                />

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
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scoreCard: { marginBottom: 15, borderRadius: 16, elevation: 4 },
    scoreContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overSection: { marginBottom: 20 },
    overSummary: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    ballCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    statsCard: { marginBottom: 20, borderRadius: 16 },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    controls: { paddingBottom: 20, paddingTop: 10 },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
    runBtn: { width: '31%', height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 12, elevation: 2, marginBottom: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    actionBtn: { flex: 1, marginHorizontal: 2, borderRadius: 8 }
});



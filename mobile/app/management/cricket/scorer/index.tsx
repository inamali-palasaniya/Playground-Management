import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, useTheme, Card, Avatar, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';
import MatchSetupModal from './MatchSetupModal';
import SelectPlayerModal from './SelectPlayerModal';
import SettingsModal from './SettingsModal';

export default function ScorerScreen() {
    const { matchId } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
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
        balls: 0, // Total valid balls bowled
        currentOver: 0, // 0-indexed over number
        currentBall: 0, // 0-indexed ball within the current over (0-5)
        innings: 1,
        strikerId: 0,
        nonStrikerId: 0,
        bowlerId: 0
    });

    const calculateState = (matchData: any) => {
        if (!matchData.ball_events || matchData.ball_events.length === 0) {
            // If no ball events, reset state or use initial setup values
            setMatchState(prev => ({
                ...prev,
                score: 0,
                wickets: 0,
                overs: 0,
                balls: 0,
                currentOver: 0,
                currentBall: 0,
                innings: matchData.current_innings || 1,
                // strikerId, nonStrikerId, bowlerId will be set by setup or remain 0
            }));
            return;
        }

        let score = 0;
        let wickets = 0;
        let validBalls = 0;
        let currentOver = 0;
        let currentBall = 0; // 0-indexed
        let strikerId = 0;
        let nonStrikerId = 0;
        let bowlerId = 0;
        let innings = matchData.current_innings || 1;

        // Iterate events to build state
        matchData.ball_events.forEach((ball: any) => {
            if (ball.innings !== innings) return; // Only process current innings

            score += ball.runs_scored + ball.extras;
            if (ball.is_wicket) wickets++;

            // Update current players based on the last ball event
            strikerId = ball.striker_id;
            nonStrikerId = ball.non_striker_id;
            bowlerId = ball.bowler_id;

            if (ball.extra_type !== 'WD' && ball.extra_type !== 'NB') {
                validBalls++;
                currentBall = (validBalls - 1) % 6;
                currentOver = Math.floor((validBalls - 1) / 6);
            }
            // If it's a wide or no-ball, it doesn't count towards validBalls,
            // so currentBall and currentOver don't advance based on it.
            // The next ball will still be the same ball_number.
        });

        const oversDisplay = `${currentOver}.${currentBall + 1}`; // For display, 1-indexed ball

        setMatchState(prev => ({
            ...prev,
            score,
            wickets,
            overs: parseFloat(oversDisplay), // Store as float for display
            balls: validBalls,
            currentOver,
            currentBall,
            innings,
            strikerId,
            nonStrikerId,
            bowlerId
        }));
    };

    const loadMatch = async () => {
        try {
            setLoading(true);
            const data = await apiService.getMatchById(Number(matchId));
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
        if (matchId) loadMatch();
    }, [matchId]);

    const handleMatchStart = async (data: any) => {
        try {
            // Determine batting team for the first innings
            let battingTeamId;
            if (data.tossDecision === 'BAT') {
                battingTeamId = data.tossWinnerId;
            } else {
                battingTeamId = (data.tossWinnerId === match.team_a_id) ? match.team_b_id : match.team_a_id;
            }

            // Update Match with Toss and Status
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
                currentBall: 0, // Start at 0-indexed ball 0
                innings: 1,
            }));

            setSetupVisible(false);
            loadMatch(); // Refresh to get updated match object and state
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

            // Determine batting team based on current_batting_team_id from match object
            const battingTeamId = match.current_batting_team_id;

            // Calculate validity based on Turf Rules
            const ballValid = (extraType !== 'WD' && extraType !== 'NB') || !settings.rebowlWideOrNoBall;

            const payload = {
                match_id: match.id,
                innings: matchState.innings,
                over_number: matchState.currentOver,
                ball_number: matchState.currentBall + 1, // 1-indexed for backend
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

            await apiService.recordBallEvent(match.id, payload);

            // Optimistic UI update
            setMatchState(prev => {
                let newScore = prev.score + runsScored + (extraType ? (runsScored === 0 ? 1 : runsScored) : 0);
                let newWickets = prev.wickets + (isWicket ? 1 : 0);
                let newStrikerId = prev.strikerId;
                let newNonStrikerId = prev.nonStrikerId;
                let newCurrentOver = prev.currentOver;
                let newCurrentBall = prev.currentBall;
                let newBalls = prev.balls;

                let swapStriker = (runsScored % 2 !== 0 && !isWicket);

                if (ballValid) {
                    newBalls++;
                    newCurrentBall++;
                    if (newCurrentBall === 6) {
                        newCurrentBall = 0;
                        newCurrentOver++;
                        swapStriker = !swapStriker;
                        setBowlerSelectionVisible(true);
                    }
                }

                if (swapStriker) {
                    [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
                }

                if (isWicket) {
                    setBatsmanSelectionVisible(true);
                }

                return {
                    ...prev,
                    score: newScore,
                    wickets: newWickets,
                    balls: newBalls,
                    currentOver: newCurrentOver,
                    currentBall: newCurrentBall,
                    overs: parseFloat(`${newCurrentOver}.${newCurrentBall}`),
                    strikerId: newStrikerId,
                    nonStrikerId: newNonStrikerId,
                };
            });

            loadMatch();

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to record ball');
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

    if (loading) return <View style={styles.container}><ActivityIndicator /></View>;
    if (!match) return <View style={styles.container}><Text>Match not found</Text></View>;

    // Helper to find player by ID
    const getPlayerById = (playerId: number) => {
        if (!match) return null;
        const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
        return allPlayers.find(p => p.id === playerId);
    };

    const currentStriker = getPlayerById(matchState.strikerId);
    const currentNonStriker = getPlayerById(matchState.nonStrikerId);
    const currentBowler = getPlayerById(matchState.bowlerId);

    // Theme Colors for Night Mode
    const bgColor = '#121212';
    const cardColor = '#1e1e1e';
    const textColor = '#ffffff';
    const accentColor = '#BB86FC';

    // Helper to find player details
    const getPlayerName = (id: number) => {
        if (!match) return 'Player';
        const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
        const p = allPlayers.find((p: any) => p.user.id === (id || p.id));
        return p?.user?.name || 'Unknown';
    };

    // Determine Batting and Bowling Teams
    const getBattingTeamId = () => {
        if (!match) return 0;
        let isTeamABatting = false;
        if (match.toss_decision === 'BAT') {
            isTeamABatting = match.toss_winner_id === match.team_a_id;
        } else {
            isTeamABatting = match.toss_winner_id !== match.team_a_id;
        }
        // If Innings 2, swap
        if (matchState.innings === 2) isTeamABatting = !isTeamABatting;

        return isTeamABatting ? match.team_a_id : match.team_b_id;
    };

    const battingTeamId = getBattingTeamId();
    const bowlingTeamId = battingTeamId === match?.team_a_id ? match?.team_b_id : match?.team_a_id;

    // Helper to format players
    const formatPlayers = (players: any[]) => players?.map((p: any) => ({
        id: p.user.id,
        name: p.user.name
    })) || [];

    const battingTeamPlayers = formatPlayers(battingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);
    const bowlingTeamPlayers = formatPlayers(bowlingTeamId === match?.team_a_id ? match?.team_a?.players : match?.team_b?.players);

    return (
        <View style={[styles.container, { backgroundColor: bgColor }]}>
            {/* Header / Scoreboard */}
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ color: textColor, fontWeight: 'bold' }}>
                        {match.team_a?.name} vs {match.team_b?.name}
                    </Text>
                    <Text variant="titleMedium" style={{ color: 'gray' }}>
                        {matchState.innings === 1 ? '1st Innings' : '2nd Innings'}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text variant="displaySmall" style={{ color: accentColor, fontWeight: 'bold', marginRight: 10 }}>
                            {matchState.score}/{matchState.wickets}
                        </Text>
                        <IconButton icon="cog" iconColor={textColor} onPress={() => setSettingsVisible(true)} />
                    </View>
                    <Text variant="titleMedium" style={{ color: textColor }}>
                        Overs: {matchState.overs} ({match.overs})
                    </Text>
                </View>
            </View>

            {/* Batsmen & Bowler Section */}
            <Card style={[styles.statsCard, { backgroundColor: cardColor }]}>
                <Card.Content>
                    <View style={styles.playerRow}>
                        <Text style={{ color: textColor, flex: 1 }}>🏏 {getPlayerName(matchState.strikerId)} *</Text>
                    </View>
                    <View style={styles.playerRow}>
                        <Text style={{ color: 'gray', flex: 1 }}>🏏 {getPlayerName(matchState.nonStrikerId)}</Text>
                    </View>
                    <Divider style={{ marginVertical: 10, backgroundColor: 'gray' }} />
                    <View style={styles.playerRow}>
                        <Text style={{ color: textColor, flex: 1 }}>🥎 {getPlayerName(matchState.bowlerId)}</Text>
                        <Text style={{ color: textColor }}>Running...</Text>
                    </View>
                </Card.Content>
            </Card>

            {/* Control Pad */}
            <View style={styles.controls}>
                {/* Runs */}
                <View style={styles.row}>
                    {[0, 1, 2, 3, 4, 6].map(run => (
                        <TouchableOpacity
                            key={run}
                            style={[styles.btn, { backgroundColor: run === 4 || run === 6 ? '#03DAC6' : '#333' }]}
                            onPress={() => handleBall(run)}
                        >
                            <Text style={{ fontSize: 24, color: run === 4 || run === 6 ? 'black' : 'white', fontWeight: 'bold' }}>{run}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Extras & Wicket */}
                <View style={styles.row}>
                    <Button mode="contained" buttonColor="#CF6679" onPress={() => handleBall(0, undefined, true)} style={styles.actionBtn}>WICKET</Button>
                    <Button mode="outlined" textColor="#BB86FC" onPress={() => handleBall(1, 'WD')} style={styles.actionBtn}>WIDE</Button>
                    <Button mode="outlined" textColor="#BB86FC" onPress={() => handleBall(1, 'NB')} style={styles.actionBtn}>NO BALL</Button>
                </View>
                <View style={styles.row}>
                    <Button mode="outlined" textColor="gray" onPress={() => handleBall(0, 'BYE')} style={styles.actionBtn}>BYE</Button>
                    <Button mode="outlined" textColor="gray" onPress={() => handleBall(0, 'LB')} style={styles.actionBtn}>LEG BYE</Button>
                    <Button mode="outlined" textColor="orange" onPress={handleUndo} style={styles.actionBtn}>UNDO</Button>
                </View>
            </View>

            <MatchSetupModal
                visible={setupVisible}
                onDismiss={() => { /* Prevent dismissal if mandatory? */ }}
                teamA={match.team_a}
                teamB={match.team_b}
                onStart={handleMatchStart}
            />

            {/* Selection Modals */}
            <SelectPlayerModal
                visible={bowlerSelectionVisible}
                onDismiss={() => { }} // Mandatory selection
                title="Select Next Bowler"
                players={bowlingTeamPlayers}
                onSelect={(p) => {
                    setMatchState(prev => ({ ...prev, bowlerId: p.id }));
                    setBowlerSelectionVisible(false);
                }}
            />

            <SelectPlayerModal
                visible={batsmanSelectionVisible}
                onDismiss={() => { }} // Mandatory
                title="Select New Batsman"
                players={battingTeamPlayers}
                onSelect={(p) => {
                    // New batsman comes on strike
                    setMatchState(prev => ({ ...prev, strikerId: p.id }));
                    setBatsmanSelectionVisible(false);
                }}
            />

            <SettingsModal
                visible={settingsVisible}
                onDismiss={() => setSettingsVisible(false)}
                settings={settings}
                onUpdateSettings={setSettings}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statsCard: { marginBottom: 20 },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    controls: { flex: 1, justifyContent: 'flex-end', paddingBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap' },
    btn: { width: '30%', aspectRatio: 1.5, justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginBottom: 10 },
    actionBtn: { flex: 1, marginHorizontal: 4 }
});

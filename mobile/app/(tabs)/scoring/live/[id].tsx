import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, Animated, Easing, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Divider, ActivityIndicator, IconButton, Surface, Avatar, Chip, SegmentedButtons, DataTable } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import apiService from '../../../../services/api.service';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
import { API_BASE_URL } from '../../../../constants/api';
const API_URL = API_BASE_URL.replace('/api', '');

export default function LiveMatchScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [statsData, setStatsData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState<'live' | 'scorecard' | 'squads'>('live');
    const [selectedScorecardInnings, setSelectedScorecardInnings] = useState<'1' | '2'>('1');

    const [animationType, setAnimationType] = useState<'4' | '6' | 'W' | null>(null);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const fetchMatchDetails = async (skipLoader = false) => {
        try {
            if (!skipLoader) setLoading(true);
            const [matchDetails, stats] = await Promise.all([
                apiService.getMatchById(Number(id), { skipLoader }),
                apiService.request(`/api/matches/${id}/stats`).catch(() => null)
            ]);
            setMatch(matchDetails);
            if (stats) {
                setStatsData(stats);
                if (matchDetails?.current_innings === 2) {
                    setSelectedScorecardInnings('2');
                }
            }
        } catch (error) {
            console.error('Error fetching match:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const checkAdmin = async () => {
        try {
            const user = await apiService.request<any>('/api/auth/me');
            setIsAdmin(user?.role !== 'NORMAL' || user?.email === '91inamali@gmail.com');
        } catch (e) {
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        checkAdmin();
    }, []);

    useEffect(() => {
        if (animationType) {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.bounce }),
                Animated.delay(1200),
                Animated.timing(scaleAnim, { toValue: 0, duration: 250, useNativeDriver: true })
            ]).start(() => setAnimationType(null));
        }
    }, [animationType]);

    useFocusEffect(
        useCallback(() => {
            fetchMatchDetails();
            const socket = io(API_URL);
            socketRef.current = socket;
            socket.on('connect', () => socket.emit('join_match', id));

            socket.on('score_update', (payload: any) => {
                fetchMatchDetails(true);

                if (payload?.type === 'BALL' && payload.data) {
                    const { runs_scored, is_wicket } = payload.data;
                    if (is_wicket) setAnimationType('W');
                    else if (runs_scored === 6) setAnimationType('6');
                    else if (runs_scored === 4) setAnimationType('4');
                }
            });

            return () => {
                if (socket) {
                    socket.emit('leave_match', id);
                    socket.disconnect();
                }
                socketRef.current = null;
            };
        }, [id])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatchDetails(true);
    };

    if (loading && !refreshing) return (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1E3A8A" />
            <Text style={{ marginTop: 12, color: '#64748B' }}>Loading Live Cricket Match...</Text>
        </View>
    );

    if (!match) return (
        <View style={styles.centerContainer}>
            <Text variant="titleMedium">Match not found</Text>
            <Button mode="contained" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/scoring')} style={{ marginTop: 16 }}>
                Go Back
            </Button>
        </View>
    );

    // Compute live calculations
    const currentInningsNum = match.current_innings || 1;
    const currentInningsStats = currentInningsNum === 1 ? statsData?.innings1 : statsData?.innings2;
    const firstInningsStats = statsData?.innings1;

    const currentScore = currentInningsStats?.totalRuns || 0;
    const currentWickets = currentInningsStats?.totalWickets || 0;
    const currentOvers = currentInningsStats?.overs || '0.0';
    const currentCRR = currentInningsStats?.runRate || '0.00';

    const target = currentInningsNum === 2 ? (firstInningsStats?.totalRuns || 0) + 1 : 0;
    const remainingRuns = target > 0 ? Math.max(0, target - currentScore) : 0;
    const maxMatchBalls = (match.overs || 20) * 6;
    const remainingBalls = target > 0 ? Math.max(0, maxMatchBalls - (currentInningsStats?.balls || 0)) : 0;
    const requiredRunRate = remainingBalls > 0 ? ((remainingRuns / remainingBalls) * 6).toFixed(2) : '0.00';

    // Live active striker and non-striker
    const liveStriker = currentInningsStats?.batting?.find((b: any) => b.id === match.current_striker_id);
    const liveNonStriker = currentInningsStats?.batting?.find((b: any) => b.id === match.current_non_striker_id);
    const liveBowler = currentInningsStats?.bowling?.find((b: any) => b.id === match.current_bowler_id);

    // Current over balls
    const currentOverBalls = (match.ball_events || [])
        .filter((b: any) => b.innings === currentInningsNum)
        .slice(-6);

    const scorecardInnings = selectedScorecardInnings === '1' ? statsData?.innings1 : statsData?.innings2;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Gradient Header Banner */}
            <LinearGradient colors={['#1E3A8A', '#0284C7']} style={styles.headerGradient}>
                <View style={styles.headerContent}>
                    <IconButton icon="arrow-left" iconColor="white" size={24} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/scoring')} />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text variant="titleMedium" style={styles.headerTitle} numberOfLines={1}>
                            {match.tournament?.name || 'Community Cup'}
                        </Text>
                        <Text variant="labelSmall" style={{ color: 'rgba(255,255,255,0.8)' }}>
                            {match.overs} Overs Match
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isAdmin && match.status !== 'COMPLETED' && (
                            <IconButton
                                icon="scoreboard"
                                iconColor="#FFD700"
                                size={22}
                                onPress={() => router.push({ pathname: '/management/cricket/scorer', params: { matchId: id } })}
                            />
                        )}
                        {isAdmin && match.status === 'COMPLETED' && (
                            <IconButton
                                icon="trophy-outline"
                                iconColor="#FFD700"
                                size={22}
                                onPress={() => router.push(`/(tabs)/scoring/analytics/${id}/awards`)}
                            />
                        )}
                        <IconButton
                            icon="chart-bar"
                            iconColor="white"
                            size={22}
                            onPress={() => router.push(`/(tabs)/scoring/analytics/${id}`)}
                        />
                        <IconButton icon="refresh" iconColor="white" size={22} onPress={onRefresh} />
                    </View>
                </View>

                {/* Scoreboard Card */}
                <Surface style={styles.scoreBoard} elevation={4}>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: match.status === 'LIVE' ? '#FEE2E2' : '#DCFCE7' }]}>
                            <Text style={[styles.statusBadgeText, { color: match.status === 'LIVE' ? '#DC2626' : '#16A34A' }]}>
                                {match.status === 'LIVE' ? '🔴 LIVE' : 'COMPLETED'}
                            </Text>
                        </View>
                        <Text style={styles.crrText}>CRR: {currentCRR}</Text>
                    </View>

                    <View style={styles.teamRow}>
                        <View style={styles.teamInfo}>
                            <Avatar.Text size={44} label={match.team_a?.name?.[0]?.toUpperCase() || 'A'} style={{ backgroundColor: '#DBEAFE' }} color="#1E3A8A" />
                            <Text variant="titleSmall" style={styles.teamName} numberOfLines={1}>{match.team_a?.name}</Text>
                        </View>

                        <View style={styles.scoreInfo}>
                            <Text variant="headlineMedium" style={styles.mainScore}>{currentScore}/{currentWickets}</Text>
                            <Text variant="titleSmall" style={styles.oversText}>Overs: {currentOvers}/{match.overs}</Text>
                            <Text variant="labelSmall" style={{ color: '#0284C7', fontWeight: 'bold' }}>
                                Innings {currentInningsNum}
                            </Text>
                        </View>

                        <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                            <Avatar.Text size={44} label={match.team_b?.name?.[0]?.toUpperCase() || 'B'} style={{ backgroundColor: '#FEE2E2' }} color="#DC2626" />
                            <Text variant="titleSmall" style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{match.team_b?.name}</Text>
                        </View>
                    </View>

                    {/* Result or Target Banner */}
                    {match.status === 'COMPLETED' ? (
                        <View style={styles.resultBanner}>
                            <Text style={styles.resultText}>🏆 {match.result_description || 'Match Concluded'}</Text>
                            {match.man_of_the_match && (
                                <Text style={styles.motmText}>Player of the Match: {match.man_of_the_match.name}</Text>
                            )}
                            {isAdmin && (
                                <TouchableOpacity 
                                    style={{ marginTop: 6, paddingVertical: 4, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignSelf: 'center' }}
                                    onPress={() => router.push(`/(tabs)/scoring/analytics/${id}/awards`)}
                                >
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>🏅 {match.man_of_the_match ? 'Change Award' : 'Select Man of the Match'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : currentInningsNum === 2 && target > 0 ? (
                        <View style={styles.targetBanner}>
                            <Text style={styles.targetText}>
                                Target: {target} • Need <Text style={{ fontWeight: 'bold' }}>{remainingRuns}</Text> in <Text style={{ fontWeight: 'bold' }}>{remainingBalls}</Text> balls (RRR: {requiredRunRate})
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.tossText}>
                            {match.toss_winner_id ? `${match.toss_winner_id === match.team_a_id ? match.team_a?.name : match.team_b?.name} won toss & elected to ${match.toss_decision}` : 'Toss Pending'}
                        </Text>
                    )}
                </Surface>
            </LinearGradient>

            {/* Segmented Navigation Tabs */}
            <View style={styles.tabContainer}>
                <SegmentedButtons
                    value={activeTab}
                    onValueChange={v => setActiveTab(v as any)}
                    buttons={[
                        { value: 'live', label: 'Live' },
                        { value: 'scorecard', label: 'Scorecard' },
                        { value: 'squads', label: 'Squads' },
                    ]}
                    style={{ marginHorizontal: 16 }}
                />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* 1. LIVE TAB */}
                {activeTab === 'live' && (
                    <View>
                        {/* Current Over Timeline */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <Text variant="labelMedium" style={styles.cardHeading}>RECENT BALLS</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ballTimeline}>
                                    {currentOverBalls.map((b: any, index: number) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.ballCircle,
                                                b.is_wicket && { backgroundColor: '#EF4444' },
                                                (b.runs_scored === 4 || b.runs_scored === 6) && { backgroundColor: '#22C55E' },
                                                b.extra_type && { backgroundColor: '#F59E0B' }
                                            ]}
                                        >
                                            <Text style={styles.ballText}>
                                                {b.is_wicket ? 'W' : (b.extra_type ? b.extra_type : b.runs_scored)}
                                            </Text>
                                        </View>
                                    ))}
                                    {currentOverBalls.length === 0 && (
                                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>Waiting for balls...</Text>
                                    )}
                                </ScrollView>
                            </Card.Content>
                        </Card>

                        {/* Live Pitch Batsmen */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <Text variant="labelMedium" style={styles.cardHeading}>ON STRIKE</Text>
                                <View style={styles.playerStatsRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                                            🏏 {liveStriker?.name || match.current_striker?.name || 'Striker'} <Text style={{ color: '#0284C7' }}>*</Text>
                                        </Text>
                                    </View>
                                    <Text style={styles.statVal}>{liveStriker?.runs || 0}</Text>
                                    <Text style={styles.statSub}>({liveStriker?.balls || 0}b)</Text>
                                    <Text style={styles.statSub}>4s: {liveStriker?.fours || 0}</Text>
                                    <Text style={styles.statSub}>6s: {liveStriker?.sixes || 0}</Text>
                                    <Text style={[styles.statSub, { fontWeight: 'bold' }]}>SR: {liveStriker?.strikeRate || '0.0'}</Text>
                                </View>

                                <Divider style={{ marginVertical: 8 }} />

                                <View style={styles.playerStatsRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <Text variant="titleSmall" style={{ color: '#475569' }}>
                                            🏏 {liveNonStriker?.name || match.current_non_striker?.name || 'Non-Striker'}
                                        </Text>
                                    </View>
                                    <Text style={styles.statVal}>{liveNonStriker?.runs || 0}</Text>
                                    <Text style={styles.statSub}>({liveNonStriker?.balls || 0}b)</Text>
                                    <Text style={styles.statSub}>4s: {liveNonStriker?.fours || 0}</Text>
                                    <Text style={styles.statSub}>6s: {liveNonStriker?.sixes || 0}</Text>
                                    <Text style={[styles.statSub, { fontWeight: 'bold' }]}>SR: {liveNonStriker?.strikeRate || '0.0'}</Text>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Live Bowler */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <Text variant="labelMedium" style={styles.cardHeading}>CURRENT BOWLER</Text>
                                <View style={styles.playerStatsRow}>
                                    <View style={{ flex: 1.5 }}>
                                        <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>
                                            🥎 {liveBowler?.name || match.current_bowler?.name || 'Bowler'}
                                        </Text>
                                    </View>
                                    <Text style={styles.statSub}>Ov: {liveBowler?.overs || '0.0'}</Text>
                                    <Text style={styles.statSub}>M: {liveBowler?.maidens || 0}</Text>
                                    <Text style={styles.statSub}>R: {liveBowler?.runs || 0}</Text>
                                    <Text style={[styles.statVal, { color: '#DC2626' }]}>W: {liveBowler?.wickets || 0}</Text>
                                    <Text style={[styles.statSub, { fontWeight: 'bold' }]}>Econ: {liveBowler?.economy || '0.0'}</Text>
                                </View>
                            </Card.Content>
                        </Card>

                        {/* Match Details Info */}
                        <Card style={styles.card}>
                            <Card.Content>
                                <Text variant="labelMedium" style={styles.cardHeading}>MATCH INFORMATION</Text>
                                <View style={styles.infoRow}><Text style={styles.infoLabel}>Tournament:</Text><Text style={styles.infoVal}>{match.tournament?.name || 'General'}</Text></View>
                                <View style={styles.infoRow}><Text style={styles.infoLabel}>Scheduled:</Text><Text style={styles.infoVal}>{format(new Date(match.start_time), 'PPp')}</Text></View>
                                <View style={styles.infoRow}><Text style={styles.infoLabel}>Overs:</Text><Text style={styles.infoVal}>{match.overs} Overs per side</Text></View>
                                <View style={styles.infoRow}><Text style={styles.infoLabel}>Status:</Text><Text style={[styles.infoVal, { fontWeight: 'bold', color: match.status === 'LIVE' ? '#DC2626' : '#16A34A' }]}>{match.status}</Text></View>
                            </Card.Content>
                        </Card>
                    </View>
                )}

                {/* 2. SCORECARD TAB */}
                {activeTab === 'scorecard' && (
                    <View>
                        <SegmentedButtons
                            value={selectedScorecardInnings}
                            onValueChange={v => setSelectedScorecardInnings(v as any)}
                            buttons={[
                                { value: '1', label: `${statsData?.innings1?.battingTeam || '1st Innings'} (${statsData?.innings1?.totalRuns || 0}/${statsData?.innings1?.totalWickets || 0})` },
                                { value: '2', label: `${statsData?.innings2?.battingTeam || '2nd Innings'} (${statsData?.innings2?.totalRuns || 0}/${statsData?.innings2?.totalWickets || 0})` }
                            ]}
                            style={{ marginBottom: 14 }}
                        />

                        {scorecardInnings ? (
                            <Card style={styles.card}>
                                <Card.Content>
                                    <View style={styles.scorecardInningsHeader}>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                            {scorecardInnings.battingTeam}: {scorecardInnings.totalRuns}/{scorecardInnings.totalWickets}
                                        </Text>
                                        <Text variant="bodySmall" style={{ color: '#64748B' }}>
                                            ({scorecardInnings.overs} Ov, RR: {scorecardInnings.runRate})
                                        </Text>
                                    </View>

                                    {/* Batting Table */}
                                    <Text variant="labelLarge" style={styles.tableHeading}>Batting</Text>
                                    <DataTable>
                                        <DataTable.Header>
                                            <DataTable.Title style={{ flex: 3 }}>Batter</DataTable.Title>
                                            <DataTable.Title numeric>R</DataTable.Title>
                                            <DataTable.Title numeric>B</DataTable.Title>
                                            <DataTable.Title numeric>4s</DataTable.Title>
                                            <DataTable.Title numeric>6s</DataTable.Title>
                                            <DataTable.Title numeric>SR</DataTable.Title>
                                        </DataTable.Header>

                                        {scorecardInnings.batting?.map((b: any) => (
                                            <DataTable.Row key={b.id}>
                                                <DataTable.Cell style={{ flex: 3 }}>
                                                    <View>
                                                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{b.name}</Text>
                                                        <Text variant="labelSmall" style={{ color: '#64748B', fontSize: 10 }}>{b.dismissal}</Text>
                                                    </View>
                                                </DataTable.Cell>
                                                <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{b.runs}</Text></DataTable.Cell>
                                                <DataTable.Cell numeric>{b.balls}</DataTable.Cell>
                                                <DataTable.Cell numeric>{b.fours}</DataTable.Cell>
                                                <DataTable.Cell numeric>{b.sixes}</DataTable.Cell>
                                                <DataTable.Cell numeric>{b.strikeRate}</DataTable.Cell>
                                            </DataTable.Row>
                                        ))}
                                    </DataTable>

                                    {/* Extras */}
                                    <View style={styles.extrasContainer}>
                                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Extras: {scorecardInnings.extras?.total || 0}</Text>
                                        <Text variant="labelSmall" style={{ color: '#64748B' }}>
                                            (wd {scorecardInnings.extras?.wides || 0}, nb {scorecardInnings.extras?.noBalls || 0}, b {scorecardInnings.extras?.byes || 0}, lb {scorecardInnings.extras?.legByes || 0})
                                        </Text>
                                    </View>

                                    <Divider style={{ marginVertical: 14 }} />

                                    {/* Bowling Table */}
                                    <Text variant="labelLarge" style={styles.tableHeading}>Bowling</Text>
                                    <DataTable>
                                        <DataTable.Header>
                                            <DataTable.Title style={{ flex: 3 }}>Bowler</DataTable.Title>
                                            <DataTable.Title numeric>O</DataTable.Title>
                                            <DataTable.Title numeric>M</DataTable.Title>
                                            <DataTable.Title numeric>R</DataTable.Title>
                                            <DataTable.Title numeric>W</DataTable.Title>
                                            <DataTable.Title numeric>Econ</DataTable.Title>
                                        </DataTable.Header>

                                        {scorecardInnings.bowling?.map((bw: any) => (
                                            <DataTable.Row key={bw.id}>
                                                <DataTable.Cell style={{ flex: 3 }}>
                                                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{bw.name}</Text>
                                                </DataTable.Cell>
                                                <DataTable.Cell numeric>{bw.overs}</DataTable.Cell>
                                                <DataTable.Cell numeric>{bw.maidens}</DataTable.Cell>
                                                <DataTable.Cell numeric>{bw.runs}</DataTable.Cell>
                                                <DataTable.Cell numeric><Text style={{ fontWeight: 'bold', color: '#DC2626' }}>{bw.wickets}</Text></DataTable.Cell>
                                                <DataTable.Cell numeric>{bw.economy}</DataTable.Cell>
                                            </DataTable.Row>
                                        ))}
                                    </DataTable>

                                    {/* Fall of Wickets */}
                                    {scorecardInnings.fallOfWickets && scorecardInnings.fallOfWickets.length > 0 && (
                                        <View style={{ marginTop: 12 }}>
                                            <Text variant="labelLarge" style={styles.tableHeading}>Fall of Wickets</Text>
                                            <Text variant="bodySmall" style={{ color: '#475569', lineHeight: 18 }}>
                                                {scorecardInnings.fallOfWickets.map((f: any) => `${f.score}/${f.wicket} (${f.batsman}, ${f.over} ov)`).join(' • ')}
                                            </Text>
                                        </View>
                                    )}
                                </Card.Content>
                            </Card>
                        ) : (
                            <View style={styles.centerContainer}>
                                <Text style={{ color: '#64748B' }}>Innings has not started yet.</Text>
                            </View>
                        )}
                    </View>
                )}

                {/* 3. SQUADS TAB */}
                {activeTab === 'squads' && (
                    <View>
                        <Card style={styles.card}>
                            <Card.Title title={match.team_a?.name} subtitle="Playing XI / Squad" />
                            <Card.Content>
                                {(match.team_a?.players || []).map((p: any, i: number) => (
                                    <View key={i} style={styles.squadPlayerRow}>
                                        <Avatar.Text size={28} label={(p.user?.name || 'P')[0]?.toUpperCase()} style={{ backgroundColor: '#DBEAFE' }} color="#1E3A8A" />
                                        <Text variant="bodyMedium" style={{ marginLeft: 10, fontWeight: 'bold' }}>
                                            {p.user?.name || p.name || 'Player'}
                                        </Text>
                                    </View>
                                ))}
                            </Card.Content>
                        </Card>

                        <Card style={styles.card}>
                            <Card.Title title={match.team_b?.name} subtitle="Playing XI / Squad" />
                            <Card.Content>
                                {(match.team_b?.players || []).map((p: any, i: number) => (
                                    <View key={i} style={styles.squadPlayerRow}>
                                        <Avatar.Text size={28} label={(p.user?.name || 'P')[0]?.toUpperCase()} style={{ backgroundColor: '#FEE2E2' }} color="#DC2626" />
                                        <Text variant="bodyMedium" style={{ marginLeft: 10, fontWeight: 'bold' }}>
                                            {p.user?.name || p.name || 'Player'}
                                        </Text>
                                    </View>
                                ))}
                            </Card.Content>
                        </Card>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Animation Overlay for Boundaries and Wickets */}
            {animationType && (
                <View style={styles.animationOverlay} pointerEvents="none">
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Text style={styles.animationText}>
                            {animationType === '6' ? '🎆 SIX! 6 🎆' : animationType === '4' ? '🏏 FOUR! 4 🏏' : '🧨 WICKET! 🧨'}
                        </Text>
                    </Animated.View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    headerGradient: { paddingTop: 45, paddingBottom: 75, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
    headerTitle: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    scoreBoard: {
        position: 'absolute',
        bottom: -50,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6
    },
    statusRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
    crrText: { fontSize: 11, fontWeight: 'bold', color: '#64748B' },
    teamRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
    teamInfo: { flex: 1, alignItems: 'center' },
    scoreInfo: { flex: 1.5, alignItems: 'center' },
    teamName: { fontWeight: 'bold', color: '#1E293B', marginTop: 4, fontSize: 12 },
    mainScore: { fontWeight: 'bold', color: '#1E3A8A' },
    oversText: { color: '#64748B', fontSize: 13 },
    resultBanner: { marginTop: 10, backgroundColor: '#ECFDF5', padding: 8, borderRadius: 8, width: '100%', alignItems: 'center' },
    resultText: { color: '#047857', fontWeight: 'bold', fontSize: 13 },
    motmText: { color: '#065F46', fontSize: 11, marginTop: 2 },
    targetBanner: { marginTop: 8, backgroundColor: '#EFF6FF', padding: 6, borderRadius: 8, width: '100%', alignItems: 'center' },
    targetText: { color: '#1D4ED8', fontSize: 11 },
    tossText: { fontSize: 11, color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 6 },
    tabContainer: { marginTop: 65, marginBottom: 8 },
    content: { flex: 1, paddingHorizontal: 16 },
    card: { marginBottom: 12, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
    cardHeading: { fontWeight: 'bold', color: '#64748B', letterSpacing: 0.5, marginBottom: 8 },
    ballTimeline: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    ballCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    ballText: { fontWeight: 'bold', fontSize: 12, color: '#1E293B' },
    playerStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    statVal: { fontWeight: 'bold', fontSize: 14, color: '#1E293B', marginRight: 4 },
    statSub: { fontSize: 11, color: '#64748B', marginRight: 4 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    infoLabel: { color: '#64748B', fontSize: 13 },
    infoVal: { color: '#1E293B', fontSize: 13 },
    scorecardInningsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    tableHeading: { fontWeight: 'bold', color: '#1E3A8A', marginVertical: 6 },
    extrasContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 8, backgroundColor: '#F8FAFC', borderRadius: 6, marginTop: 8 },
    squadPlayerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    animationOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1000
    },
    animationText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FCD34D',
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 8
    }
});

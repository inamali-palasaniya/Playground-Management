import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, Animated, Easing } from 'react-native';
import { Text, Button, Card, Divider, ActivityIndicator, IconButton, Surface, Avatar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import apiService from '../../../../services/api.service';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function LiveMatchScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [animationType, setAnimationType] = useState<'4' | '6' | 'W' | null>(null);
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const fetchMatchDetails = async (skipLoader = false) => {
        try {
            const data = await apiService.getMatchById(Number(id), { skipLoader });
            setMatch(data);
        } catch (error) {
            console.error('Error fetching match:', error);
            Alert.alert('Error', 'Failed to load match details');
        } finally {
            setLoading(false);
        }
    };

    const checkAdmin = async () => {
        try {
            const user = await apiService.request<any>('/api/auth/me');
            setIsAdmin(user?.role !== 'NORMAL');
        } catch (e) {
            setIsAdmin(false);
        }
    };

    useEffect(() => {
        checkAdmin();
    }, []);

    const calculateScore = (events: any[]) => {
        if (!events) return { score: 0, wickets: 0, balls: 0 };
        const currentInnings = match?.current_innings || 1;
        return events.reduce((acc, curr) => {
            if (curr.innings === currentInnings) {
                acc.score += (curr.runs_scored || 0) + (curr.extras || 0);
                if (curr.is_wicket) acc.wickets += 1;
                if (curr.is_valid_ball) acc.balls += 1;
            }
            return acc;
        }, { score: 0, wickets: 0, balls: 0 });
    };

    const stats = calculateScore(match?.ball_events);
    const overs = `${Math.floor(stats.balls / 6)}.${stats.balls % 6}`;

    useEffect(() => {
        if (animationType) {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.bounce }),
                Animated.delay(1500),
                Animated.timing(scaleAnim, { toValue: 0, duration: 300, useNativeDriver: true })
            ]).start(() => setAnimationType(null));
        }
    }, [animationType]);

    useFocusEffect(
        useCallback(() => {
            fetchMatchDetails(); // Initial load with loader
            const socket = io(API_URL);
            socketRef.current = socket;
            socket.on('connect', () => socket.emit('join_match', id));

            socket.on('score_update', (payload: any) => {
                fetchMatchDetails(true); // Skip loader on update

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

    if (loading) return (
        <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1a237e" />
        </View>
    );

    if (!match) return (
        <View style={styles.centerContainer}>
            <Text>Match not found</Text>
            <Button mode="contained" onPress={() => router.back()} style={{ marginTop: 20 }}>Go Back</Button>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient colors={['#1a237e', '#0d47a1']} style={styles.headerGradient}>
                <View style={styles.headerContent}>
                    <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                    <Text variant="titleLarge" style={styles.headerTitle}>{match.tournament?.name || 'Match Details'}</Text>
                    {isAdmin && match.status !== 'COMPLETED' ? (
                        <IconButton icon="pencil" iconColor="white" onPress={() => router.push({ pathname: '/management/cricket/scorer', params: { matchId: id } })} />
                    ) : <View style={{ width: 48 }} />}
                </View>

                <Surface style={styles.scoreBoard} elevation={4}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>{match.status}</Text>
                    </View>

                    <View style={styles.teamRow}>
                        <View style={styles.teamInfo}>
                            <Avatar.Text size={48} label={match.team_a?.name?.[0]?.toUpperCase() || 'A'} />
                            <Text variant="titleSmall" style={styles.teamName} numberOfLines={1}>{match.team_a?.name}</Text>
                        </View>

                        <View style={styles.scoreInfo}>
                            <Text variant="displaySmall" style={styles.mainScore}>{stats.score}/{stats.wickets}</Text>
                            <Text variant="titleMedium" style={styles.oversText}>Overs: {overs} / {match.overs}</Text>
                        </View>

                        <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                            <Avatar.Text size={48} label={match.team_b?.name?.[0]?.toUpperCase() || 'B'} />
                            <Text variant="titleSmall" style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{match.team_b?.name}</Text>
                        </View>
                    </View>

                    <Divider style={styles.divider} />
                    <Text style={styles.tossText}>
                        {match.toss_winner_id ? `${match.toss_winner_id === match.team_a_id ? match.team_a?.name : match.team_b?.name} won toss & elected to ${match.toss_decision}` : 'Toss Pending'}
                    </Text>
                </Surface>
            </LinearGradient>

            <ScrollView style={styles.content}>
                <Card style={styles.card}>
                    <Card.Title
                        title="Match Info"
                        left={(props) => <MaterialCommunityIcons name="information" size={24} color="#1a237e" />}
                    />
                    <Card.Content>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Venue:</Text>
                            <Text style={styles.infoValue}>{match.venue || 'Main Turf'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Date:</Text>
                            <Text style={styles.infoValue}>{format(new Date(match.start_time), 'PPp')}</Text>
                        </View>
                    </Card.Content>
                </Card>

                {isAdmin && match.status !== 'COMPLETED' && (
                    <Button
                        mode="contained"
                        icon="scoreboard"
                        style={styles.scoreButton}
                        onPress={() => router.push({ pathname: '/management/cricket/scorer', params: { matchId: id } })}
                    >
                        GO TO SCORER
                    </Button>
                )}
            </ScrollView>

            {/* Animation Overlay */}
            {
                animationType && (
                    <View style={styles.animationOverlay} pointerEvents="none">
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <Text style={styles.animationText}>
                                {animationType === '6' ? '🎆 6 🎆' : animationType === '4' ? '🏏 4 🏏' : '🧨 WICKET 🧨'}
                            </Text>
                        </Animated.View>
                    </View>
                )
            }
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerGradient: { paddingTop: 50, paddingBottom: 100, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
    headerTitle: { color: 'white', fontWeight: 'bold' },
    scoreBoard: {
        position: 'absolute',
        bottom: -60,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4
    },
    statusBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginBottom: 10 },
    statusBadgeText: { fontSize: 10, color: '#2e7d32', fontWeight: 'bold' },
    teamRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
    teamInfo: { flex: 1, alignItems: 'center' },
    scoreInfo: { flex: 1.5, alignItems: 'center' },
    teamName: { fontWeight: 'bold', color: '#1a1a1a', marginTop: 8, fontSize: 12 },
    mainScore: { fontWeight: 'bold', color: '#1a237e' },
    oversText: { color: '#666' },
    divider: { width: '100%', marginVertical: 15, backgroundColor: '#eee', height: 1 },
    tossText: { fontSize: 12, color: '#666', fontStyle: 'italic', textAlign: 'center' },
    content: { marginTop: 100, padding: 20 },
    card: { marginBottom: 20, backgroundColor: 'white', borderRadius: 12 },
    infoRow: { flexDirection: 'row', marginBottom: 8 },
    infoLabel: { width: 80, color: 'gray', fontWeight: 'bold' },
    infoValue: { flex: 1, color: '#333' },
    scoreButton: { marginTop: 20, borderRadius: 8, paddingVertical: 4 },
    animationOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 1000
    },
    animationText: {
        fontSize: 64,
        fontWeight: 'bold',
        color: '#FFD700',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10
    }
});

import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, ImageBackground } from 'react-native';
import { Text, Button, Card, Divider, ActivityIndicator, IconButton, Surface } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import apiService from '../../../../services/api.service';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000'; // Socket URL base

export default function LiveMatchScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [liveScore, setLiveScore] = useState<any>(null); // To store real-time score
    const socketRef = useRef<Socket | null>(null);

    const fetchMatchDetails = async () => {
        try {
            const data = await apiService.getMatchById(Number(id));
            setMatch(data);
            // Initialize live score from current match state if available
            // For now, assuming match data has some score info, or we start fresh.
        } catch (error) {
            console.error('Error fetching match:', error);
            Alert.alert('Error', 'Failed to load match details');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            console.log('Focus: Connecting Socket');
            // Fetch initial data
            fetchMatchDetails();

            // Connect Socket
            const socket = io(API_URL);
            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('Socket Connected');
                socket.emit('join_match', id);
            });

            socket.on('score_update', (data) => {
                console.log('Live Score Update:', data);
                // Update local state with new ball event
                // In a real app, calculate full score from this delta or fetch fresh summary
                // For "WOW" effect, we'll flash an update
                setLiveScore((prev: any) => ({
                    ...prev,
                    lastEvent: data,
                    totalRuns: (prev?.totalRuns || match?.runs || 0) + data.runs_scored + data.extras
                }));
                // Also re-fetch full details to be safe for sync
                fetchMatchDetails();
            });

            return () => {
                console.log('Blur: Disconnecting Socket');
                if (socket) {
                    socket.emit('leave_match', id);
                    socket.disconnect();
                }
                socketRef.current = null;
            };
        }, [id])
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6200ee" />
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.centerContainer}>
                <Text>Match not found</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={['#141E30', '#243B55']}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} />
                    <Text variant="titleLarge" style={styles.headerTitle}>
                        {match.tournament?.name || 'Tournament Match'}
                    </Text>
                    <View style={{ width: 48 }} />
                </View>

                {/* Scoreboard Card */}
                <Surface style={styles.scoreBoard} elevation={4}>
                    <View style={styles.teamRow}>
                        <View style={styles.teamInfo}>
                            <Text variant="headlineSmall" style={styles.teamName}>{match.team_a?.name}</Text>
                            <Text variant="titleMedium" style={styles.teamScore}>
                                {match.team_a_score || '0/0'} <Text style={styles.overs}>(0.0)</Text>
                            </Text>
                        </View>
                        <Text style={styles.vs}>VS</Text>
                        <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                            <Text variant="headlineSmall" style={styles.teamName}>{match.team_b?.name}</Text>
                            <Text variant="titleMedium" style={styles.teamScore}>
                                {match.team_b_score || '0/0'} <Text style={styles.overs}>(0.0)</Text>
                            </Text>
                        </View>
                    </View>

                    <Divider style={styles.divider} />

                    <View style={styles.statusRow}>
                        <Text style={styles.statusText}>{match.status === 'LIVE' ? '🔴 LIVE' : match.status}</Text>
                        <Text style={styles.statusText}>{match.toss_result || 'Toss TBD'}</Text>
                    </View>

                    {liveScore?.lastEvent && (
                        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.lastEventPopup}>
                            <Text style={styles.eventText}>
                                {liveScore.lastEvent.runs_scored} Runs! {liveScore.lastEvent.is_wicket ? 'WICKET!' : ''}
                            </Text>
                        </LinearGradient>
                    )}
                </Surface>
            </LinearGradient>

            <ScrollView style={styles.content}>
                {/* Batting/Bowling Stats would go here similar to CrickHeroes */}
                <Card style={styles.card}>
                    <Card.Title title="Live Commentary" left={(props) => <IconButton {...props} icon="microphone" />} />
                    <Card.Content>
                        <Text variant="bodyMedium">Waiting for next ball...</Text>
                        {/* Map commentary list here */}
                    </Card.Content>
                </Card>

                {/* Admin/Scorer Controls (if user is admin, check role) */}
                <Button mode="contained" onPress={() => Alert.alert('Info', 'Scoring Controls available in Management Tab')} style={styles.scoreButton}>
                    Go to Management
                </Button>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f2f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerGradient: {
        paddingTop: 50,
        paddingBottom: 80, // Space for scoreboard overlap
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    headerTitle: {
        color: 'white',
        fontWeight: 'bold',
    },
    scoreBoard: {
        position: 'absolute',
        bottom: -60,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center', // Center content if needed
    },
    teamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        alignItems: 'center',
    },
    teamInfo: {
        flex: 1,
    },
    teamName: {
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    teamScore: {
        color: '#333',
        fontWeight: 'bold',
        marginTop: 5,
    },
    overs: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'normal',
    },
    vs: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#888',
        marginHorizontal: 10,
    },
    divider: {
        width: '100%',
        marginVertical: 15,
        backgroundColor: '#eee',
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    statusText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    content: {
        marginTop: 70, // Push content down below scoreboard
        padding: 20,
    },
    card: {
        marginBottom: 20,
        backgroundColor: 'white',
    },
    lastEventPopup: {
        marginTop: 10,
        paddingHorizontal: 20,
        paddingVertical: 5,
        borderRadius: 15,
    },
    eventText: {
        fontWeight: 'bold',
        color: '#333',
    },
    scoreButton: {
        marginTop: 10,
        marginBottom: 30,
    }
});

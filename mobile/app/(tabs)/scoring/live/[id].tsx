import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Card, Divider } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useRef } from 'react';

export default function LiveScoring() {
    const { id } = useLocalSearchParams();
    const [score, setScore] = useState({ runs: 0, wickets: 0, overs: 0, balls: 0 });
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Connect to WebSocket
        // Replace with actual IP if running on device
        ws.current = new WebSocket('ws://localhost:3000');

        ws.current.onopen = () => {
            console.log('Connected to scoring server');
        };

        ws.current.onmessage = (e) => {
            const message = JSON.parse(e.data);
            if (message.type === 'SCORE_UPDATE') {
                // Update state based on payload
                // Simplified for demo
                console.log('Score update:', message.payload);
            }
        };

        return () => {
            ws.current?.close();
        };
    }, []);

    const sendBallEvent = (runs: number, isWicket: boolean = false) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            const payload = {
                type: 'BALL_EVENT',
                payload: {
                    matchId: Number(id),
                    bowlerId: 1, // Mock
                    strikerId: 1, // Mock
                    runsScored: runs,
                    isWicket,
                    extras: 0,
                    overNumber: score.overs,
                    ballNumber: score.balls + 1,
                },
            };
            ws.current.send(JSON.stringify(payload));

            // Optimistic update
            setScore(prev => ({
                ...prev,
                runs: prev.runs + runs,
                wickets: isWicket ? prev.wickets + 1 : prev.wickets,
                balls: prev.balls + 1 === 6 ? 0 : prev.balls + 1,
                overs: prev.balls + 1 === 6 ? prev.overs + 1 : prev.overs,
            }));
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.scoreCard}>
                <Card.Content style={styles.scoreCardContent}>
                    <Text variant="headlineLarge" style={styles.scoreText}>{score.runs}/{score.wickets}</Text>
                    <Text variant="titleMedium" style={styles.oversText}>Overs: {score.overs}.{score.balls}</Text>
                </Card.Content>
            </Card>

            <Text variant="titleMedium" style={styles.controlsHeader}>Scoring Controls</Text>
            <View style={styles.controlsContainer}>
                {[0, 1, 2, 3, 4, 6].map((run) => (
                    <Button
                        key={run}
                        mode="contained"
                        style={styles.controlButton}
                        onPress={() => sendBallEvent(run)}
                    >
                        {run}
                    </Button>
                ))}
                <Button
                    mode="contained"
                    buttonColor="red"
                    style={styles.controlButton}
                    onPress={() => sendBallEvent(0, true)}
                >
                    OUT
                </Button>
                <Button
                    mode="contained"
                    buttonColor="orange"
                    style={styles.controlButton}
                    onPress={() => { }} // Handle extras
                >
                    WD
                </Button>
                <Button
                    mode="contained"
                    buttonColor="orange"
                    style={styles.controlButton}
                    onPress={() => { }} // Handle extras
                >
                    NB
                </Button>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    scoreCard: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    scoreCardContent: {
        alignItems: 'center',
    },
    scoreText: {
        fontWeight: 'bold',
    },
    oversText: {
        color: '#4b5563',
    },
    controlsHeader: {
        marginBottom: 8,
    },
    controlsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    controlButton: {
        marginBottom: 8,
        width: '30%',
    },
});

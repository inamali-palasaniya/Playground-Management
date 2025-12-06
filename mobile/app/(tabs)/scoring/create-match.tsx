import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import apiService from '../../../services/api.service';

export default function CreateMatch() {
    const router = useRouter();
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [overs, setOvers] = useState('20');
    const [loading, setLoading] = useState(false);

    const handleStart = async () => {
        if (!teamA.trim() || !teamB.trim()) {
            Alert.alert('Error', 'Please enter both team names');
            return;
        }

        const oversNum = parseInt(overs);
        if (isNaN(oversNum) || oversNum <= 0) {
            Alert.alert('Error', 'Please enter a valid number of overs');
            return;
        }

        setLoading(true);
        try {
            // For now, we'll use the first tournament from seeded data (ID: 1)
            // In a real app, you'd let the user select the tournament
            const match = await apiService.createMatch({
                tournament_id: 1,
                team_a_id: 1, // Warriors
                team_b_id: 2, // Titans
                start_time: new Date().toISOString(),
                overs: oversNum,
            });

            Alert.alert('Success', 'Match created successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.replace(`/scoring/live/${match.id}`),
                },
            ]);
        } catch (error) {
            console.error('Failed to create match:', error);
            Alert.alert('Error', 'Failed to create match. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Start New Match</Text>

            <TextInput
                label="Team A Name"
                value={teamA}
                onChangeText={setTeamA}
                style={styles.input}
                disabled={loading}
            />
            <TextInput
                label="Team B Name"
                value={teamB}
                onChangeText={setTeamB}
                style={styles.input}
                disabled={loading}
            />
            <TextInput
                label="Overs"
                value={overs}
                onChangeText={setOvers}
                keyboardType="numeric"
                style={styles.input}
                disabled={loading}
            />

            <Button
                mode="contained"
                onPress={handleStart}
                style={styles.button}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : 'Start Match'}
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
    },
    header: {
        marginBottom: 16,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 16,
    },
});

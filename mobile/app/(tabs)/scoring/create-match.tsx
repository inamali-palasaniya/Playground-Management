import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function CreateMatch() {
    const router = useRouter();
    const [teamA, setTeamA] = useState('');
    const [teamB, setTeamB] = useState('');
    const [overs, setOvers] = useState('20');

    const handleStart = () => {
        // Call API to create match
        // For now, mock navigation to live scoring
        const matchId = '123';
        router.replace(`/scoring/live/${matchId}`);
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Start New Match</Text>

            <TextInput
                label="Team A Name"
                value={teamA}
                onChangeText={setTeamA}
                style={styles.input}
            />
            <TextInput
                label="Team B Name"
                value={teamB}
                onChangeText={setTeamB}
                style={styles.input}
            />
            <TextInput
                label="Overs"
                value={overs}
                onChangeText={setOvers}
                keyboardType="numeric"
                style={styles.input}
            />

            <Button mode="contained" onPress={handleStart} style={styles.button}>
                Start Match
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

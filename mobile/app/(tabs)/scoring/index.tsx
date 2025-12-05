import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';

const LIVE_MATCHES = [
    { id: '1', teamA: 'Warriors', teamB: 'Titans', score: '145/3 (18.2)', status: 'LIVE' },
    { id: '2', teamA: 'Eagles', teamB: 'Sharks', score: 'Yet to Bat', status: 'SCHEDULED' },
];

export default function ScoringDashboard() {
    const router = useRouter();
    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.header}>Matches</Text>

            <Button mode="contained" icon="plus" style={styles.button} onPress={() => router.push('/(tabs)/scoring/create-match')}>
                Start New Match
            </Button>

            <FlatList
                data={LIVE_MATCHES}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium" style={styles.matchTitle}>{item.teamA} vs {item.teamB}</Text>
                                <Chip icon="circle" selectedColor={item.status === 'LIVE' ? 'red' : 'gray'}>{item.status}</Chip>
                            </View>
                            <Text variant="bodyMedium">Score: {item.score}</Text>
                        </Card.Content>
                        <Card.Actions>
                            <Button onPress={() => router.push(`/scoring/live/${item.id}`)}>View</Button>
                            {item.status === 'LIVE' && <Button mode="contained-tonal" onPress={() => router.push(`/scoring/live/${item.id}`)}>Score</Button>}
                        </Card.Actions>
                    </Card>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        marginBottom: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    button: {
        marginBottom: 16,
    },
    card: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    matchTitle: {
        fontWeight: 'bold',
    },
});

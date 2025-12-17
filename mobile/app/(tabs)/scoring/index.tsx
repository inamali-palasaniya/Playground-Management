import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function ScoringDashboard() {
    const router = useRouter();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMatches = async () => {
        try {
            const data = await apiService.getMatches();
            setMatches(data);
        } catch (error) {
            console.error('Failed to fetch matches:', error);
            Alert.alert('Error', 'Failed to load matches. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.header}>Matches</Text>

            <Button mode="contained" icon="plus" style={styles.button} onPress={() => router.push('/(tabs)/scoring/create-match')}>
                Start New Match
            </Button>

            <FlatList
                data={matches}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium" style={styles.matchTitle}>
                                    {item.team_a?.name || 'Team A'} vs {item.team_b?.name || 'Team B'}
                                </Text>
                                <Chip icon="circle" selectedColor={item.status === 'LIVE' ? 'red' : 'gray'}>
                                    {item.status}
                                </Chip>
                            </View>
                            <Text variant="bodyMedium">
                                {item.tournament?.name || 'Tournament'}
                            </Text>
                            <Text variant="bodySmall" style={styles.overs}>
                                {item.overs} overs
                            </Text>
                        </Card.Content>
                        <Card.Actions>
                            {item.status === 'COMPLETED' && (
                                <Button onPress={() => router.push(`/scoring/analytics/${item.id}`)}>View Analytics</Button>
                            )}
                            {item.status !== 'COMPLETED' && (
                                <Button onPress={() => router.push(`/(tabs)/scoring/live/${item.id}`)}>View</Button>
                            )}
                            {item.status === 'LIVE' && (
                                <Button mode="contained-tonal" onPress={() => router.push(`/(tabs)/scoring/live/${item.id}`)}>Score</Button>
                            )}
                        </Card.Actions>
                    </Card>
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No matches found. Create one to get started!</Text>
                }
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
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
        flex: 1,
    },
    overs: {
        marginTop: 4,
        color: '#6b7280',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 32,
        color: '#6b7280',
    },
});

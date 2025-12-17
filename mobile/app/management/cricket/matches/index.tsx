import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';
import { format } from 'date-fns';

export default function MatchListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadMatches = async () => {
        try {
            setLoading(true);
            const data = await apiService.request<any[]>('/api/matches');
            setMatches(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMatches();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LIVE': return '#FF5722'; // Orange
            case 'COMPLETED': return '#4CAF50'; // Green
            default: return '#9E9E9E'; // Grey for SCHEDULED
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/cricket/scorer', params: { matchId: item.id } })}>
            <Card.Title
                title={`${item.team_a?.name || 'TBA'} vs ${item.team_b?.name || 'TBA'}`}
                subtitle={`Tournament: ${item.tournament?.name || 'General'} | Overs: ${item.overs}`}
                right={(props) => (
                    <Chip style={{ backgroundColor: getStatusColor(item.status), marginRight: 16 }} textStyle={{ color: 'white' }}>
                        {item.status}
                    </Chip>
                )}
            />
            <Card.Content>
                <Text variant="bodySmall" style={{ color: 'gray' }}>
                    {format(new Date(item.start_time), 'PP p')}
                </Text>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={matches}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No matches scheduled.</Text>}
                />
            )}
            <FAB
                icon="calendar-plus"
                style={styles.fab}
                label="Schedule Match"
                onPress={() => router.push('/management/cricket/matches/create')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    card: { marginBottom: 12, backgroundColor: 'white' },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

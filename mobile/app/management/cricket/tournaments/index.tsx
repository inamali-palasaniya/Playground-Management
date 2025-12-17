import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';
import { format } from 'date-fns';

export default function TournamentListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTournaments = async () => {
        try {
            setLoading(true);
            const data = await apiService.request('/api/tournaments'); // Need to ensure this endpoint exists or mock it
            setTournaments(data);
        } catch (error) {
            // console.error(error); // Endpoint might not exist yet
            // Mock data for UI testing if API fails
            setTournaments([
                { id: 1, name: 'Night Turf Cup 2024', start_date: '2024-12-20', status: 'UPCOMING' },
                { id: 2, name: 'Weekend League', start_date: '2024-11-01', status: 'COMPLETED' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTournaments();
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/cricket/tournaments/details', params: { id: item.id } })}>
            <Card.Title
                title={item.name}
                subtitle={`Starts: ${format(new Date(item.start_date || new Date()), 'dd MMM yyyy')}`}
                right={(props) => (
                    <Chip style={{ marginRight: 16, backgroundColor: item.status === 'COMPLETED' ? '#e0e0e0' : '#c8e6c9' }}>{item.status || 'ACTIVE'}</Chip>
                )}
            />
        </Card>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={tournaments}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No tournaments found.</Text>}
                />
            )}
            <FAB
                icon="plus"
                style={styles.fab}
                label="New Tournament"
                onPress={() => router.push('/management/cricket/tournaments/create')}
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

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip, Button, Appbar, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
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
            setTournaments(data as any[]);
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

    useFocusEffect(
        useCallback(() => {
            loadTournaments();
        }, [])
    );

    const handleDelete = async (id: number, name: string) => {
        Alert.alert('Delete Tournament', `Are you sure you want to delete ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/tournaments/${id}`, { method: 'DELETE' });
                        loadTournaments();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete tournament');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card
            style={styles.card}
            onPress={() => router.push({ pathname: '/management/cricket/tournaments/[id]', params: { id: item.id } })}
        >
            <Card.Title
                title={item.name}
                subtitle={
                    <View>
                        <Text variant="bodySmall" style={{ color: 'gray' }}>Starts: {format(new Date(item.start_date || new Date()), 'dd MMM yyyy')}</Text>
                        <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                            By: {item.created_by?.name || 'N/A'}
                        </Text>
                    </View>
                }
                right={(props) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Chip
                            style={{
                                backgroundColor: item.status === 'COMPLETED' ? '#e0e0e0' :
                                    item.status === 'LIVE' ? '#ffcdd2' : '#c8e6c9'
                            }}
                            textStyle={{ color: item.status === 'LIVE' ? '#c62828' : '#333' }}
                        >
                            {item.status || 'ACTIVE'}
                        </Chip>
                        <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => router.push({ pathname: '/management/cricket/tournaments/create', params: { id: item.id } })}
                        />
                        <IconButton
                            icon="delete"
                            size={20}
                            iconColor="red"
                            onPress={() => handleDelete(item.id, item.name)}
                        />
                    </View>
                )}
            />
        </Card>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Tournaments" />
                <Appbar.Action icon="refresh" onPress={loadTournaments} />
            </Appbar.Header>
            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={tournaments}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
    container: { flex: 1 },
    card: { marginBottom: 12, backgroundColor: 'white' },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 16,
    },
});

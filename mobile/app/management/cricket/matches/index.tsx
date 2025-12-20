import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip, Appbar, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Match', 'Are you sure you want to delete this match?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/matches/${id}`, { method: 'DELETE' });
                        loadMatches();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete match');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card
            style={styles.card}
            onPress={() => {
                if (item.status === 'COMPLETED') {
                    router.push(`/(tabs)/scoring/live/${item.id}`);
                } else {
                    router.push({ pathname: '/management/cricket/scorer', params: { matchId: item.id } });
                }
            }}
        >
            <Card.Title
                title={`${item.team_a?.name || 'TBA'} vs ${item.team_b?.name || 'TBA'}`}
                subtitle={`Tournament: ${item.tournament?.name || 'General'} | Overs: ${item.overs}`}
                right={(props) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Chip style={{ backgroundColor: getStatusColor(item.status), marginRight: 4 }} textStyle={{ color: 'white', fontSize: 10 }}>
                            {item.status}
                        </Chip>
                        <IconButton
                            icon="pencil"
                            size={18}
                            onPress={() => router.push({ pathname: '/management/cricket/matches/create', params: { id: item.id } })}
                        />
                        <IconButton
                            icon="delete"
                            size={18}
                            iconColor="red"
                            onPress={() => handleDelete(item.id)}
                        />
                    </View>
                )}
            />
            <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                        {format(new Date(item.start_time), 'PP p')}
                    </Text>
                    <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic' }}>
                        By: {item.created_by?.name || 'N/A'}
                    </Text>
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
                <Appbar.BackAction onPress={() => router.replace('/management/cricket')} />
                <Appbar.Content title="Matches" />
                <Appbar.Action icon="refresh" onPress={loadMatches} />
            </Appbar.Header>
            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={matches}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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

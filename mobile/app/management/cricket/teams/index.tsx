import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip, Button, Appbar, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';

export default function TeamListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTeams = async () => {
        try {
            setLoading(true);
            const data = await apiService.request<any[]>('/api/teams');
            setTeams(data);
        } catch (error) {
            console.error(error);
            // Alert.alert('Error', 'Failed to load teams'); // Optional
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTeams();
    }, []);

    const handleDelete = async (id: number, name: string) => {
        Alert.alert('Delete Team', `Are you sure you want to delete ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/teams/${id}`, { method: 'DELETE' });
                        loadTeams();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete team');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/cricket/teams/[id]', params: { id: item.id } })}>
            <Card.Title
                title={item.name}
                subtitle={`${item._count?.players || 0} Players`}
                right={(props) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton
                            icon="pencil"
                            size={20}
                            onPress={() => router.push({ pathname: '/management/cricket/teams/create', params: { id: item.id } })}
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
                <Appbar.Content title="Teams" />
                <Appbar.Action icon="refresh" onPress={loadTeams} />
            </Appbar.Header>
            <View style={styles.container}>
                {loading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={teams}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No teams found. Create one!</Text>}
                    />
                )}
                <FAB
                    icon="plus"
                    style={styles.fab}
                    label="New Team"
                    onPress={() => router.push('/management/cricket/teams/create')}
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

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, FAB, ActivityIndicator, useTheme, Chip, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
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

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/cricket/teams/[id]', params: { id: item.id } })}>
            <Card.Title
                title={item.name}
                subtitle={`${item._count?.players || 0} Players`}
                right={(props) => <Text style={{ marginRight: 16, color: 'gray' }}>#{item.id}</Text>}
            />
        </Card>
    );

    return (
        <View style={styles.container}>
            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={teams}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
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

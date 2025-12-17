import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, Avatar, FAB, Button, Portal, Modal, TextInput, ActivityIndicator, IconButton, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function TeamDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const [team, setTeam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadTeam = async () => {
        try {
            const data = await apiService.getTeamById(Number(id));
            setTeam(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load team');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await apiService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (id) {
            loadTeam();
            loadUsers();
        }
    }, [id]);

    const handleAddPlayer = async (userId: number) => {
        try {
            await apiService.addPlayerToTeam(Number(id), userId);
            setModalVisible(false);
            loadTeam(); // Refresh
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to add player');
        }
    };

    const handleRemovePlayer = async (userId: number) => {
        Alert.alert('Confirm', 'Remove player from team?', [
            { text: 'Cancel' },
            {
                text: 'Remove', onPress: async () => {
                    try {
                        await apiService.removePlayerFromTeam(Number(id), userId);
                        loadTeam();
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        ]);
    };

    const filteredUsers = users.filter((u) => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !team?.players.some((p: any) => p.user.id === u.id)
    );

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
    if (!team) return <View style={styles.container}><Text>Team not found</Text></View>;

    return (
        <View style={styles.container}>
            <Card style={{ marginBottom: 10, padding: 10 }}>
                <Text variant="headlineSmall">{team.name}</Text>
                <Text variant="bodyMedium" style={{ color: 'gray' }}>Tournament: {team.tournament?.name}</Text>
                <Text variant="bodySmall" style={{ marginTop: 5 }}>Players: {team.players.length}</Text>
            </Card>

            <FlatList
                data={team.players}
                keyExtractor={(item: any) => item.id.toString()}
                renderItem={({ item }) => (
                    <Card style={styles.playerCard}>
                        <Card.Title
                            title={item.user.name}
                            subtitle={item.user.role}
                            left={(props) => <Avatar.Text {...props} label={item.user.name.substring(0, 2).toUpperCase()} size={40} />}
                            right={(props) => (
                                <IconButton {...props} icon="delete" iconColor="red" onPress={() => handleRemovePlayer(item.user.id)} />
                            )}
                        />
                    </Card>
                )}
            />

            <FAB
                style={styles.fab}
                icon="account-plus"
                label="Add Player"
                onPress={() => setModalVisible(true)}
            />

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="headlineSmall" style={{ marginBottom: 10 }}>Add Player</Text>
                    <TextInput
                        placeholder="Search User..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        mode="outlined"
                        style={{ marginBottom: 10 }}
                    />
                    <FlatList
                        data={filteredUsers.slice(0, 20)} // Limit for performance
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <Card style={{ marginBottom: 5 }} onPress={() => handleAddPlayer(item.id)}>
                                <Card.Title
                                    title={item.name}
                                    subtitle={item.user_type}
                                    right={(props) => <IconButton {...props} icon="plus" />}
                                />
                            </Card>
                        )}
                        style={{ maxHeight: 300 }}
                    />
                    <Button onPress={() => setModalVisible(false)} style={{ marginTop: 10 }}>Close</Button>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
    playerCard: { marginBottom: 8, backgroundColor: 'white' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    modalContent: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8, maxHeight: '80%' }
});

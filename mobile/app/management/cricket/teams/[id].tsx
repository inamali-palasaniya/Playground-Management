import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Card, Text, Avatar, FAB, Button, Portal, Modal, TextInput, ActivityIndicator, IconButton, useTheme, Appbar, TouchableRipple } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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

    if (loading) return (
        <SafeAreaView style={styles.safeArea}>
            <ActivityIndicator style={{ marginTop: 20 }} />
        </SafeAreaView>
    );

    if (!team) return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Team Details" />
            </Appbar.Header>
            <View style={styles.container}><Text>Team not found</Text></View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={team.name} subtitle={team.tournament?.name} />
                <Appbar.Action icon="refresh" onPress={loadTeam} />
            </Appbar.Header>

            <View style={styles.container}>
                <Card style={styles.headerCard}>
                    <Card.Content style={styles.headerContent}>
                        <View style={styles.statsItem}>
                            <Text variant="headlineMedium" style={styles.statsValue}>{team.players.length}</Text>
                            <Text variant="labelMedium" style={styles.statsLabel}>PLAYERS</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statsItem}>
                            <Avatar.Icon size={40} icon="trophy-outline" style={{ backgroundColor: theme.colors.primaryContainer }} />
                            <Text variant="labelMedium" style={[styles.statsLabel, { marginTop: 4 }]}>TOURNAMENT</Text>
                        </View>
                    </Card.Content>
                </Card>

                <View style={styles.listHeader}>
                    <Text variant="titleMedium">Squad List</Text>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>{team.players.length} Total</Text>
                </View>

                <FlatList
                    data={team.players}
                    keyExtractor={(item: any) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <Card style={styles.playerCard} mode="contained">
                            <Card.Title
                                title={item.user.name}
                                subtitle={item.user.role || 'Player'}
                                left={(props) => <Avatar.Text {...props} label={item.user.name.substring(0, 2).toUpperCase()} size={40} />}
                                right={(props) => (
                                    <IconButton {...props} icon="delete" iconColor={theme.colors.error} onPress={() => handleRemovePlayer(item.user.id)} />
                                )}
                            />
                        </Card>
                    )}
                />
            </View>

            <FAB
                style={styles.fab}
                icon="account-plus"
                label="Add Player"
                onPress={() => setModalVisible(true)}
            />

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modalContent}>
                    <Text variant="titleLarge" style={{ marginBottom: 16 }}>Add Player to Team</Text>
                    <TextInput
                        placeholder="Search users..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        mode="outlined"
                        left={<TextInput.Icon icon="magnify" />}
                        style={{ marginBottom: 16 }}
                    />
                    <FlatList
                        data={filteredUsers.slice(0, 20)}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <TouchableRipple onPress={() => handleAddPlayer(item.id)}>
                                <View style={styles.userSearchItem}>
                                    <Avatar.Text size={36} label={item.name.substring(0, 2).toUpperCase()} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text variant="bodyLarge">{item.name}</Text>
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>{item.user_type}</Text>
                                    </View>
                                    <IconButton icon="plus-circle-outline" />
                                </View>
                            </TouchableRipple>
                        )}
                        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                        style={{ maxHeight: 400 }}
                    />
                    <Button mode="outlined" onPress={() => setModalVisible(false)} style={{ marginTop: 16 }}>Cancel</Button>
                </Modal>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
    container: { flex: 1, padding: 16 },
    headerCard: { marginBottom: 20, backgroundColor: 'white', borderRadius: 12, elevation: 2 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 10 },
    statsItem: { alignItems: 'center', flex: 1 },
    statsValue: { fontWeight: 'bold', color: '#6200ee' },
    statsLabel: { color: 'gray', letterSpacing: 1 },
    divider: { width: 1, height: '80%', backgroundColor: '#eee' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
    playerCard: { marginBottom: 8, backgroundColor: 'white', borderRadius: 8 },
    userSearchItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 20 },
    modalContent: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 16, maxHeight: '80%' }
});


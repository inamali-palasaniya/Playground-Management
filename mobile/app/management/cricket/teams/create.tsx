import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Menu, Chip, Appbar, Portal } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';

export default function CreateTeamScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load tournaments
        apiService.request<any[]>('/api/tournaments')
            .then(setTournaments)
            .catch(console.error);

        // If editing, load team details
        if (id) {
            setLoading(true);
            apiService.getTeamById(Number(id))
                .then(data => {
                    setName(data.name);
                    setSelectedTournament(data.tournament);
                })
                .catch(err => {
                    console.error(err);
                    Alert.alert('Error', 'Failed to load team');
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Team name required');
        if (!selectedTournament) return Alert.alert('Error', 'Tournament selection required');

        try {
            setLoading(true);
            const payload = {
                name: name,
                tournament_id: selectedTournament.id
            };

            if (id) {
                // Using generic request for PUT because apiService.updateTeam only takes name
                await apiService.request(`/api/teams/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiService.request('/api/teams', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
            }

            Alert.alert('Success', `Team ${id ? 'updated' : 'created'}!`);
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', `Failed to ${id ? 'save' : 'create'} team`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={id ? "Edit Team" : "New Team"} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.container}>
                <TextInput
                    label="Team Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={{ marginBottom: 20 }}
                />

                <View style={{ marginBottom: 20 }}>
                    <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '500' }}>Tournament</Text>
                    <Portal>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setMenuVisible(true)} style={{ width: '100%', marginBottom: 16 }}>
                                    {selectedTournament ? selectedTournament.name : 'Select Tournament'}
                                </Button>
                            }
                        >
                            {tournaments.map(t => (
                                <Menu.Item
                                    key={t.id}
                                    onPress={() => { setSelectedTournament(t); setMenuVisible(false); }}
                                    title={t.name}
                                />
                            ))}
                        </Menu>
                    </Portal>
                    {selectedTournament && (
                        <Chip icon="check-circle" style={{ alignSelf: 'flex-start' }}>{selectedTournament.name}</Chip>
                    )}
                </View>

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={{ marginTop: 20 }}
                >
                    {id ? "Update Team" : "Create Team"}
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { padding: 20 }
});


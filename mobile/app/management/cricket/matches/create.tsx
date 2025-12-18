import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Menu, Divider, Appbar, Portal, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';

export default function CreateMatchScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);

    // Form State
    const [teamA, setTeamA] = useState<any>(null);
    const [teamB, setTeamB] = useState<any>(null);
    const [overs, setOvers] = useState('10');
    const [loading, setLoading] = useState(false);

    // Menus
    const [tourMenu, setTourMenu] = useState(false);
    const [teamAMenu, setTeamAMenu] = useState(false);
    const [teamBMenu, setTeamBMenu] = useState(false);

    useEffect(() => {
        apiService.request<any[]>('/api/tournaments').then(setTournaments).catch(console.error);
    }, []);

    useEffect(() => {
        if (selectedTournament) {
            // Fetch teams for this tournament
            apiService.request<any[]>(`/api/teams?tournament_id=${selectedTournament.id}`)
                .then(setTeams)
                .catch(console.error);
            setTeamA(null);
            setTeamB(null);
        }
    }, [selectedTournament]);

    const handleCreate = async () => {
        if (!selectedTournament) return Alert.alert('Error', 'Select a tournament');
        if (!teamA || !teamB) return Alert.alert('Error', 'Select both teams');
        if (teamA.id === teamB.id) return Alert.alert('Error', 'Teams must be different');

        try {
            setLoading(true);
            const payload = {
                tournament_id: selectedTournament.id,
                team_a_id: teamA.id,
                team_b_id: teamB.id,
                start_time: new Date().toISOString(),
                overs: parseInt(overs)
            };

            if (id) {
                await apiService.request(`/api/matches/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
            } else {
                await apiService.createMatch(payload);
            }
            Alert.alert('Success', id ? 'Match Updated!' : 'Match Scheduled!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to save match');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={id ? "Edit Match" : "Schedule Match"} />
            </Appbar.Header>
            <ScrollView contentContainerStyle={styles.container}>
                <Text variant="headlineSmall" style={{ marginBottom: 20 }}>Match Details</Text>

                {/* Tournament Selector */}
                <Portal.Host>
                    <Menu
                        visible={tourMenu}
                        onDismiss={() => setTourMenu(false)}
                        anchor={<Button mode="outlined" onPress={() => setTourMenu(true)} style={styles.input}>{selectedTournament ? selectedTournament.name : 'Select Tournament'}</Button>}
                    >
                        {tournaments.map(t => (
                            <Menu.Item key={t.id} onPress={() => { setSelectedTournament(t); setTourMenu(false); }} title={t.name} />
                        ))}
                    </Menu>
                </Portal.Host>

                <Divider style={{ marginVertical: 15 }} />

                {/* Team A Selector */}
                <Portal.Host>
                    <Menu
                        visible={teamAMenu}
                        onDismiss={() => setTeamAMenu(false)}
                        anchor={<Button mode="outlined" disabled={!selectedTournament} onPress={() => setTeamAMenu(true)} style={styles.input}>{teamA ? teamA.name : 'Select Team A'}</Button>}
                    >
                        {teams.map(t => (
                            <Menu.Item key={t.id} onPress={() => { setTeamA(t); setTeamAMenu(false); }} title={t.name} />
                        ))}
                    </Menu>
                </Portal.Host>

                <Text style={{ textAlign: 'center', marginVertical: 10 }}>VS</Text>

                {/* Team B Selector */}
                <Portal.Host>
                    <Menu
                        visible={teamBMenu}
                        onDismiss={() => setTeamBMenu(false)}
                        anchor={<Button mode="outlined" disabled={!selectedTournament} onPress={() => setTeamBMenu(true)} style={styles.input}>{teamB ? teamB.name : 'Select Team B'}</Button>}
                    >
                        {teams.map(t => (
                            <Menu.Item key={t.id} onPress={() => { setTeamB(t); setTeamBMenu(false); }} title={t.name} />
                        ))}
                    </Menu>
                </Portal.Host>

                <TextInput
                    label="Overs per Innings"
                    value={overs}
                    onChangeText={setOvers}
                    keyboardType="numeric"
                    mode="outlined"
                    style={[styles.input, { marginTop: 20 }]}
                />

                <Button
                    mode="contained"
                    onPress={handleCreate}
                    loading={loading}
                    disabled={loading}
                    style={{ marginTop: 20 }}
                >
                    {id ? 'Update Match' : 'Schedule Match'}
                </Button>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { padding: 20, paddingBottom: 100 },
    input: { marginBottom: 10 }
});


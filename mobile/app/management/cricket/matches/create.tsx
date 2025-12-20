import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Divider, Appbar, useTheme } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';
import GenericSelectModal from '../scorer/GenericSelectModal';

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

    // Selection Modals
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
            router.replace('/management/cricket/matches');
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
                <Appbar.BackAction onPress={() => router.replace('/management/cricket/matches')} />
                <Appbar.Content title={id ? "Edit Match" : "Schedule Match"} />
            </Appbar.Header>
            <ScrollView contentContainerStyle={styles.container}>
                <Text variant="headlineSmall" style={styles.heading}>Match Details</Text>

                {/* Tournament Selector */}
                <Button
                    mode="outlined"
                    onPress={() => setTourMenu(true)}
                    style={styles.input}
                    icon="trophy-outline"
                >
                    {selectedTournament ? selectedTournament.name : 'Select Tournament'}
                </Button>

                <Divider style={{ marginVertical: 15 }} />

                <View style={styles.vsRow}>
                    <Button
                        mode="outlined"
                        disabled={!selectedTournament}
                        onPress={() => setTeamAMenu(true)}
                        style={[styles.input, { flex: 1, marginRight: 5 }]}
                    >
                        {teamA ? teamA.name : 'Team A'}
                    </Button>
                    <Text style={styles.vsText}>VS</Text>
                    <Button
                        mode="outlined"
                        disabled={!selectedTournament}
                        onPress={() => setTeamBMenu(true)}
                        style={[styles.input, { flex: 1, marginLeft: 5 }]}
                    >
                        {teamB ? teamB.name : 'Team B'}
                    </Button>
                </View>

                <TextInput
                    label="Overs per Innings"
                    value={overs}
                    onChangeText={setOvers}
                    keyboardType="numeric"
                    mode="outlined"
                    style={[styles.input, { marginTop: 10 }]}
                    left={<TextInput.Icon icon="counter" />}
                />

                <Button
                    mode="contained"
                    onPress={handleCreate}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitBtn}
                >
                    {id ? 'Update Match' : 'Schedule Match'}
                </Button>

                <GenericSelectModal
                    visible={tourMenu}
                    onDismiss={() => setTourMenu(false)}
                    title="Select Tournament"
                    items={tournaments}
                    onSelect={setSelectedTournament}
                    selectedValue={selectedTournament?.id}
                />

                <GenericSelectModal
                    visible={teamAMenu}
                    onDismiss={() => setTeamAMenu(false)}
                    title="Select Team A"
                    items={teams}
                    onSelect={setTeamA}
                    selectedValue={teamA?.id}
                />

                <GenericSelectModal
                    visible={teamBMenu}
                    onDismiss={() => setTeamBMenu(false)}
                    title="Select Team B"
                    items={teams}
                    onSelect={setTeamB}
                    selectedValue={teamB?.id}
                />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { padding: 20, paddingBottom: 100 },
    heading: { marginBottom: 20, fontWeight: 'bold' },
    input: { marginBottom: 10, borderRadius: 8 },
    vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
    vsText: { fontWeight: 'bold', color: 'gray' },
    submitBtn: { marginTop: 30, borderRadius: 8, paddingVertical: 5 }
});

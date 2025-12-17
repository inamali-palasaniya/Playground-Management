import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Menu, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function CreateMatchScreen() {
    const router = useRouter();
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
            await apiService.createMatch({
                tournament_id: selectedTournament.id,
                team_a_id: teamA.id,
                team_b_id: teamB.id,
                start_time: new Date().toISOString(), // Default to Now for quick start, or add date picker later
                overs: parseInt(overs)
            });
            Alert.alert('Success', 'Match Scheduled!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create match');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineSmall" style={{ marginBottom: 20 }}>Schedule Match</Text>
            
            {/* Tournament Selector */}
            <Menu
                visible={tourMenu}
                onDismiss={() => setTourMenu(false)}
                anchor={<Button mode="outlined" onPress={() => setTourMenu(true)} style={styles.input}>{selectedTournament ? selectedTournament.name : 'Select Tournament'}</Button>}
            >
                {tournaments.map(t => (
                    <Menu.Item key={t.id} onPress={() => { setSelectedTournament(t); setTourMenu(false); }} title={t.name} />
                ))}
            </Menu>

            <Divider style={{ marginVertical: 15 }} />

            {/* Team A Selector */}
            <Menu
                visible={teamAMenu}
                onDismiss={() => setTeamAMenu(false)}
                anchor={<Button mode="outlined" disabled={!selectedTournament} onPress={() => setTeamAMenu(true)} style={styles.input}>{teamA ? teamA.name : 'Select Team A'}</Button>}
            >
                {teams.map(t => (
                    <Menu.Item key={t.id} onPress={() => { setTeamA(t); setTeamAMenu(false); }} title={t.name} />
                ))}
            </Menu>

            <Text style={{ textAlign: 'center', marginVertical: 10 }}>VS</Text>

             {/* Team B Selector */}
             <Menu
                visible={teamBMenu}
                onDismiss={() => setTeamBMenu(false)}
                anchor={<Button mode="outlined" disabled={!selectedTournament} onPress={() => setTeamBMenu(true)} style={styles.input}>{teamB ? teamB.name : 'Select Team B'}</Button>}
            >
                {teams.map(t => (
                    <Menu.Item key={t.id} onPress={() => { setTeamB(t); setTeamBMenu(false); }} title={t.name} />
                ))}
            </Menu>

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
                Schedule Match
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' },
    input: { marginBottom: 10 }
});

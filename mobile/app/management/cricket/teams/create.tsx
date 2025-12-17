import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, useTheme, Menu, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function CreateTeamScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournament, setSelectedTournament] = useState<any>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        apiService.request<any[]>('/api/tournaments').then(setTournaments).catch(console.error);
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Team name required');
        if (!selectedTournament) return Alert.alert('Error', 'Tournament Selection required');

        try {
            setLoading(true);
            await apiService.request('/api/teams', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    tournament_id: selectedTournament.id
                })
            });
            Alert.alert('Success', 'Team created!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create team');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text variant="headlineSmall" style={{ marginBottom: 20 }}>New Team</Text>

            <TextInput
                label="Team Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={{ marginBottom: 20 }}
            />

            <View style={{ marginBottom: 20 }}>
                <Text variant="bodyMedium" style={{ marginBottom: 5 }}>Tournament</Text>
                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <Button mode="outlined" onPress={() => setMenuVisible(true)}>
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
            </View>

            <Button
                mode="contained"
                onPress={handleCreate}
                loading={loading}
                disabled={loading}
            >
                Create Team
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' }
});

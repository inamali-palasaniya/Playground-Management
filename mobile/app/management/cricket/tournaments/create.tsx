import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme, Appbar } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';

export default function CreateTournamentScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            setLoading(true);
            apiService.getTournamentById(Number(id))
                .then(data => {
                    setName(data.name);
                })
                .catch(err => {
                    console.error(err);
                    Alert.alert('Error', 'Failed to load tournament');
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSave = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Please enter a tournament name');

        try {
            setLoading(true);
            const payload = {
                name: name,
                game_id: 1, // Assuming 1 is Cricket
                start_date: new Date().toISOString()
            };

            if (id) {
                await apiService.updateTournament(Number(id), payload);
            } else {
                await apiService.createTournament(payload);
            }

            Alert.alert('Success', `Tournament ${id ? 'updated' : 'created'}!`);
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', `Failed to ${id ? 'update' : 'create'} tournament`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={id ? "Edit Tournament" : "New Tournament"} />
            </Appbar.Header>

            <View style={styles.container}>
                <TextInput
                    label="Tournament Name"
                    value={name}
                    onChangeText={setName}
                    mode="outlined"
                    style={{ marginBottom: 20 }}
                />

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                >
                    {id ? "Update Tournament" : "Create Tournament"}
                </Button>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1, padding: 20 }
});


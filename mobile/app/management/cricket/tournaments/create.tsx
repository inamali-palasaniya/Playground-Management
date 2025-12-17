import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function CreateTournamentScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return Alert.alert('Error', 'Please enter a tournament name');

        try {
            setLoading(true);
            await apiService.request('/api/tournaments', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    game_id: 1, // Assuming 1 is Cricket or handle lookup
                    start_date: new Date().toISOString()
                })
            });
            Alert.alert('Success', 'Tournament created!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to create tournament');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={{ marginBottom: 20 }}>New Tournament</Text>
            
            <TextInput
                label="Tournament Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={{ marginBottom: 20 }}
            />

            <Button 
                mode="contained" 
                onPress={handleCreate} 
                loading={loading}
                disabled={loading}
            >
                Create Tournament
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' }
});

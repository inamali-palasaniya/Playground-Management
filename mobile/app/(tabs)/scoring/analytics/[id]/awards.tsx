import { View, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Avatar, List, RadioButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../../../services/api.service';

export default function ManageAwardsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadMatch();
    }, [id]);

    const loadMatch = async () => {
        try {
            const data = await apiService.getMatchById(Number(id));
            setMatch(data);
            if (data.man_of_the_match_id) {
                setSelectedPlayer(data.man_of_the_match_id);
            }
        } catch (error) {
            console.error('Error loading match:', error);
            Alert.alert('Error', 'Failed to load match details');
        }
    };

    const handleSave = async () => {
        if (!selectedPlayer) {
            Alert.alert('Error', 'Please select a player');
            return;
        }

        setSubmitting(true);
        try {
            await apiService.setManOfTheMatch(Number(id), selectedPlayer);
            Alert.alert('Success', 'Man of the Match updated successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Error setting award:', error);
            Alert.alert('Error', 'Failed to update award');
        } finally {
            setSubmitting(false);
        }
    };

    if (!match) return null;

    const allPlayers = [
        ...match.team_a.players.map((p: any) => ({ ...p, teamName: match.team_a.name })),
        ...match.team_b.players.map((p: any) => ({ ...p, teamName: match.team_b.name }))
    ];

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Select Man of the Match</Text>
            
            <Card style={styles.listCard}>
                <Card.Content>
                    <RadioButton.Group 
                        onValueChange={value => setSelectedPlayer(Number(value))} 
                        value={selectedPlayer?.toString() || ''}
                    >
                        <List.Section>
                            {allPlayers.map((player: any) => (
                                <List.Item
                                    key={player.user.id}
                                    title={player.user.name}
                                    description={player.teamName}
                                    left={props => <Avatar.Text {...props} size={32} label={player.user.name.substring(0, 2)} />}
                                    right={() => <RadioButton value={player.user.id.toString()} />}
                                />
                            ))}
                        </List.Section>
                    </RadioButton.Group>
                </Card.Content>
            </Card>

            <Button 
                mode="contained" 
                onPress={handleSave} 
                loading={submitting} 
                style={styles.button}
            >
                Save Award
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    listCard: {
        flex: 1,
        marginBottom: 16,
    },
    button: {
        marginBottom: 16,
    },
});

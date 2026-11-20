import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Card, Button, Avatar, List, RadioButton, Appbar, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../../services/api.service';

export default function ManageAwardsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
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
                { text: 'OK', onPress: () => router.canGoBack() ? router.back() : router.replace('/(tabs)/scoring') }
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
        ...(match.team_a?.players || []).map((p: any) => ({ ...p, teamName: match.team_a?.name || 'Team A' })),
        ...(match.team_b?.players || []).map((p: any) => ({ ...p, teamName: match.team_b?.name || 'Team B' }))
    ];

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/scoring')} />
                <Appbar.Content title="Player of the Match" titleStyle={{ fontWeight: 'bold' }} />
            </Appbar.Header>

            <ScrollView style={styles.container}>
                <Text variant="titleMedium" style={styles.header}>Select Player of the Match</Text>
                
                <Card style={styles.listCard}>
                    <Card.Content>
                        <RadioButton.Group 
                            onValueChange={value => setSelectedPlayer(Number(value))} 
                            value={selectedPlayer?.toString() || ''}
                        >
                            <List.Section>
                                {allPlayers.map((player: any) => {
                                    const pId = player.user?.id || player.id;
                                    const pName = player.user?.name || player.name || 'Player';
                                    return (
                                        <List.Item
                                            key={pId}
                                            title={pName}
                                            description={player.teamName}
                                            left={props => <Avatar.Text {...props} size={32} label={pName.substring(0, 2).toUpperCase()} />}
                                            right={() => <RadioButton value={pId.toString()} />}
                                            onPress={() => setSelectedPlayer(Number(pId))}
                                        />
                                    );
                                })}
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
            </ScrollView>
        </SafeAreaView>
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

import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Avatar, Button, DataTable, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../../services/api.service';

export default function MatchAnalyticsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [match, setMatch] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [matchData, statsData] = await Promise.all([
                apiService.getMatchById(Number(id)),
                apiService.getMatchStats(Number(id))
            ]);
            setMatch(matchData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading analytics:', error);
            Alert.alert('Error', 'Failed to load match analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!match || !stats) return null;

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.summaryCard}>
                <Card.Content style={{ alignItems: 'center' }}>
                    <Text variant="labelMedium" style={styles.matchDate}>{new Date(match.start_time).toDateString()}</Text>
                    <View style={styles.scoreContainer}>
                        <View style={styles.teamContainer}>
                            <Avatar.Text size={48} label={match.team_a.name.substring(0, 2)} style={{ backgroundColor: '#e3f2fd' }} color="#1565c0" />
                            <Text variant="titleMedium" style={styles.teamName}>{match.team_a.name}</Text>
                        </View>
                        <Text variant="displaySmall" style={styles.vsText}>VS</Text>
                        <View style={styles.teamContainer}>
                            <Avatar.Text size={48} label={match.team_b.name.substring(0, 2)} style={{ backgroundColor: '#ffebee' }} color="#c62828" />
                            <Text variant="titleMedium" style={styles.teamName}>{match.team_b.name}</Text>
                        </View>
                    </View>
                    <Chip icon="check-circle" style={styles.statusChip}>{match.status}</Chip>

                    {match.man_of_the_match && (
                        <View style={styles.awardBanner}>
                            <Avatar.Icon size={32} icon="trophy" style={{ backgroundColor: 'gold' }} />
                            <Text variant="titleSmall" style={{ marginLeft: 8 }}>PLAYER OF THE MATCH: </Text>
                            <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{match.man_of_the_match.name}</Text>
                        </View>
                    )}

                    <Button
                        mode="contained-tonal"
                        icon="trophy-outline"
                        onPress={() => router.push(`/scoring/analytics/${id}/awards`)}
                        style={styles.awardButton}
                    >
                        Manage Awards
                    </Button>
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Batting</Text>
            </View>

            <Card style={styles.statsCard}>
                <Card.Content>
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title style={{ flex: 3 }}>Batter</DataTable.Title>
                            <DataTable.Title numeric>R</DataTable.Title>
                            <DataTable.Title numeric>B</DataTable.Title>
                            <DataTable.Title numeric>4s</DataTable.Title>
                            <DataTable.Title numeric>6s</DataTable.Title>
                        </DataTable.Header>

                        {stats.batting.map((player: any) => (
                            <DataTable.Row key={player.id}>
                                <DataTable.Cell style={{ flex: 3 }}>
                                    <View>
                                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{player.name}</Text>
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{player.runs}</Text></DataTable.Cell>
                                <DataTable.Cell numeric>{player.balls}</DataTable.Cell>
                                <DataTable.Cell numeric>{player.fours}</DataTable.Cell>
                                <DataTable.Cell numeric>{player.sixes}</DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                </Card.Content>
            </Card>

            <View style={styles.sectionHeader}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Bowling</Text>
            </View>

            <Card style={styles.statsCard}>
                <Card.Content>
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title style={{ flex: 3 }}>Bowler</DataTable.Title>
                            <DataTable.Title numeric>O</DataTable.Title>
                            <DataTable.Title numeric>R</DataTable.Title>
                            <DataTable.Title numeric>W</DataTable.Title>
                        </DataTable.Header>

                        {stats.bowling.map((player: any) => (
                            <DataTable.Row key={player.id}>
                                <DataTable.Cell style={{ flex: 3 }}>
                                    <View>
                                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{player.name}</Text>
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell numeric>{player.overs}</DataTable.Cell>
                                <DataTable.Cell numeric>{player.runs}</DataTable.Cell>
                                <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{player.wickets}</Text></DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                </Card.Content>
            </Card>
            <View style={{ height: 24 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 12,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryCard: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        elevation: 2,
    },
    matchDate: {
        color: '#666',
        marginBottom: 12,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    teamContainer: {
        alignItems: 'center',
        width: 100,
    },
    teamName: {
        marginTop: 8,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    vsText: {
        fontWeight: '900',
        color: '#ddd',
        fontSize: 32,
    },
    statusChip: {
        backgroundColor: '#e8f5e9',
        marginBottom: 16,
    },
    awardBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff9c4',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        width: '100%',
        marginBottom: 12,
    },
    awardButton: {
        width: '100%',
    },
    sectionHeader: {
        marginBottom: 8,
        marginLeft: 4,
    },
    statsCard: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { Card, Text, Avatar, Button, ActivityIndicator, Appbar, useTheme, Chip, Divider, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../../services/api.service';
import { format } from 'date-fns';

export default function TournamentDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const [tournament, setTournament] = useState<any>(null);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tData, teamsData, matchesData] = await Promise.all([
                apiService.getTournamentById(Number(id)),
                apiService.getTeamsByTournament(Number(id)),
                apiService.getMatches(Number(id))
            ]);
            setTournament(tData);
            setTeams(teamsData);
            setMatches(matchesData);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load tournament details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const renderMatchItem = ({ item }: { item: any }) => (
        <Card
            style={styles.matchCard}
            onPress={() => router.push({ pathname: '/management/cricket/scorer', params: { matchId: item.id } })}
        >
            <Card.Content>
                <View style={styles.matchHeader}>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>{format(new Date(item.start_time), 'MMM dd, h:mm a')}</Text>
                    <Chip style={{ height: 24, backgroundColor: item.status === 'LIVE' ? '#ffebee' : '#f5f5f5' }} textStyle={{ fontSize: 10, color: item.status === 'LIVE' ? 'red' : 'gray' }}>
                        {item.status}
                    </Chip>
                </View>
                <View style={styles.teamsRow}>
                    <Text variant="titleMedium" style={styles.teamName}>{item.team_a?.name}</Text>
                    <Text variant="labelSmall" style={styles.vsText}>VS</Text>
                    <Text variant="titleMedium" style={styles.teamName}>{item.team_b?.name}</Text>
                </View>
            </Card.Content>
        </Card>
    );

    if (loading) return (
        <SafeAreaView style={styles.safeArea}>
            <ActivityIndicator style={{ marginTop: 20 }} />
        </SafeAreaView>
    );

    if (!tournament) return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Tournament" />
            </Appbar.Header>
            <View style={styles.container}><Text>Tournament not found</Text></View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title={tournament.name} titleStyle={{ fontWeight: 'bold' }} />
                <Appbar.Action icon="refresh" onPress={loadData} />
            </Appbar.Header>

            <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Stats Summary */}
                <Card style={styles.statsCard}>
                    <Card.Content style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{teams.length}</Text>
                            <Text variant="labelSmall" style={{ color: 'gray' }}>TEAMS</Text>
                        </View>
                        <Divider style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text variant="headlineMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{matches.length}</Text>
                            <Text variant="labelSmall" style={{ color: 'gray' }}>MATCHES</Text>
                        </View>
                    </Card.Content>
                </Card>

                {/* Teams Section */}
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Participating Teams</Text>
                    <Button mode="text" compact onPress={() => router.push({ pathname: '/management/cricket/teams/create', params: { tournament_id: id } })}>Add Team</Button>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsScroll}>
                    {teams.map(team => (
                        <Card key={team.id} style={styles.teamCard} onPress={() => router.push(`/management/cricket/teams/${team.id}`)}>
                            <Card.Content style={{ alignItems: 'center', padding: 12 }}>
                                <Avatar.Text size={40} label={team.name.substring(0, 2).toUpperCase()} />
                                <Text variant="labelMedium" numberOfLines={1} style={{ marginTop: 8, textAlign: 'center' }}>{team.name}</Text>
                            </Card.Content>
                        </Card>
                    ))}
                    {teams.length === 0 && <Text style={styles.emptyText}>No teams added yet.</Text>}
                </ScrollView>

                {/* Matches Section */}
                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Matches</Text>
                    <Button mode="contained-tonal" compact onPress={() => router.push('/management/cricket/matches/create')}>Schedule</Button>
                </View>

                {matches.length > 0 ? (
                    matches.map(item => <View key={item.id}>{renderMatchItem({ item })}</View>)
                ) : (
                    <Text style={[styles.emptyText, { marginTop: 10 }]}>No matches scheduled.</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
    container: { flex: 1, padding: 16 },
    statsCard: { marginBottom: 20, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10 },
    statItem: { alignItems: 'center' },
    verticalDivider: { width: 1, height: '80%', backgroundColor: '#eee' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
    teamsScroll: { marginBottom: 20 },
    teamCard: { width: 100, marginRight: 12, backgroundColor: 'white', elevation: 1 },
    matchCard: { marginBottom: 12, backgroundColor: 'white', borderRadius: 12, elevation: 1 },
    matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamName: { flex: 1, textAlign: 'center', fontWeight: 'bold' },
    vsText: { marginHorizontal: 10, color: 'gray', fontWeight: 'bold' },
    emptyText: { color: 'gray', fontStyle: 'italic', paddingLeft: 4 }
});

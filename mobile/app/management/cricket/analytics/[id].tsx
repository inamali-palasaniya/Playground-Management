import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, ActivityIndicator, useTheme, Appbar, SegmentedButtons, DataTable, Avatar, Card, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import apiService from '../../../../services/api.service';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchAnalyticsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState('summary'); // summary, scorecard, commentary

    const loadData = async () => {
        try {
            const data = await apiService.request(`/api/matches/${id}/stats`);
            setMatch(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();

        // Auto-poll for live updates if match is active
        const interval = setInterval(() => {
            if (match && !match.is_completed) {
                // Silent fetch to update data without showing full loader blocking UI
                apiService.request(`/api/matches/${id}/stats`).then(data => {
                    setMatch(data);
                }).catch(err => console.log("Polling error", err));
            } else if (!match) {
                // Initial polling if match not yet loaded
                loadData();
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [id, match?.is_completed]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading && !refreshing) return <ActivityIndicator style={{ flex: 1 }} />;
    if (!match) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Match not found</Text></View>;

    const innings1 = match.stats?.innings1 || {};
    const innings2 = match.stats?.innings2 || {};

    const renderSummary = () => (
        <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 10 }}>Match Result</Text>
                    <Text variant="headlineSmall" style={{ textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                        {match.result_description || 'Match in Progress'}
                    </Text>
                    {match.man_of_the_match && (
                        <View style={{ alignItems: 'center', marginTop: 15 }}>
                            <Text variant="labelMedium">Man of the Match</Text>
                            <Avatar.Text size={48} label={match.man_of_the_match.name.substring(0, 2).toUpperCase()} style={{ marginTop: 5 }} />
                            <Text variant="titleMedium" style={{ marginTop: 5 }}>{match.man_of_the_match.name}</Text>
                        </View>
                    )}
                </Card.Content>
            </Card>

            <View style={styles.scoreRow}>
                <Card style={{ flex: 1, marginRight: 5 }}>
                    <Card.Content style={{ alignItems: 'center' }}>
                        <Text variant="labelSmall">{match.team_a?.name}</Text>
                        {/* We need total score here, likely from stats or backend field. Using computed for now if not in stats object directly */}
                        <Text variant="titleLarge">{Object.values(innings1.batting || {}).reduce((a: any, b: any) => a + b.runs, 0)}/{Object.values(innings2.bowling || {}).reduce((a: any, b: any) => a + b.wickets, 0)}</Text>
                    </Card.Content>
                </Card>
                <Card style={{ flex: 1, marginLeft: 5 }}>
                    <Card.Content style={{ alignItems: 'center' }}>
                        <Text variant="labelSmall">{match.team_b?.name}</Text>
                        <Text variant="titleLarge">{Object.values(innings2.batting || {}).reduce((a: any, b: any) => a + b.runs, 0)}/{Object.values(innings1.bowling || {}).reduce((a: any, b: any) => a + b.wickets, 0)}</Text>
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
    );

    const renderScorecard = (inningsData: any, teamName: string) => (
        <Card style={styles.card}>
            <Card.Title title={`${teamName} Innings`} />
            <DataTable>
                <DataTable.Header>
                    <DataTable.Title>Batter</DataTable.Title>
                    <DataTable.Title numeric>R</DataTable.Title>
                    <DataTable.Title numeric>B</DataTable.Title>
                    <DataTable.Title numeric>4s</DataTable.Title>
                    <DataTable.Title numeric>6s</DataTable.Title>
                </DataTable.Header>

                {Object.entries(inningsData.batting || {}).map(([id, s]: any) => {
                    // Ideally we have names map. Assuming we can map ids to names from players list or backend returns names in stats (Current implementation returns map by ID).
                    // We need to find player name from match.team_a/b.players
                    const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
                    const player = allPlayers.find(p => (p.user?.id || p.id) == id);
                    const name = player?.user?.name || player?.name || 'Unk';

                    return (
                        <DataTable.Row key={id}>
                            <DataTable.Cell>{name}</DataTable.Cell>
                            <DataTable.Cell numeric>{s.runs}</DataTable.Cell>
                            <DataTable.Cell numeric>{s.balls}</DataTable.Cell>
                            <DataTable.Cell numeric>{s['4s']}</DataTable.Cell>
                            <DataTable.Cell numeric>{s['6s']}</DataTable.Cell>
                        </DataTable.Row>
                    );
                })}
            </DataTable>
            <Divider />
            <DataTable>
                <DataTable.Header>
                    <DataTable.Title>Bowler</DataTable.Title>
                    <DataTable.Title numeric>O</DataTable.Title>
                    <DataTable.Title numeric>R</DataTable.Title>
                    <DataTable.Title numeric>W</DataTable.Title>
                </DataTable.Header>
                {Object.entries(inningsData.bowling || {}).map(([id, s]: any) => {
                    const allPlayers = [...(match.team_a?.players || []), ...(match.team_b?.players || [])];
                    const player = allPlayers.find(p => (p.user?.id || p.id) == id);
                    const name = player?.user?.name || player?.name || 'Unk';
                    return (
                        <DataTable.Row key={id}>
                            <DataTable.Cell>{name}</DataTable.Cell>
                            <DataTable.Cell numeric>{s.overs}</DataTable.Cell>
                            <DataTable.Cell numeric>{s.runs}</DataTable.Cell>
                            <DataTable.Cell numeric>{s.wickets}</DataTable.Cell>
                        </DataTable.Row>
                    );
                })}
            </DataTable>
        </Card>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Match Analytics" />
            </Appbar.Header>

            <View style={{ padding: 10 }}>
                <SegmentedButtons
                    value={tab}
                    onValueChange={setTab}
                    buttons={[
                        { value: 'summary', label: 'Summary' },
                        { value: 'scorecard', label: 'Scorecard' },
                        { value: 'commentary', label: 'Ball-by-Ball' },
                    ]}
                />
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {tab === 'summary' && renderSummary()}

                {tab === 'scorecard' && (
                    <View style={styles.content}>
                        {renderScorecard(innings1, match.team_a?.name)}
                        <View style={{ height: 10 }} />
                        {renderScorecard(innings2, match.team_b?.name)}
                    </View>
                )}

                {tab === 'commentary' && (
                    <View style={styles.content}>
                        {/* Reverse order ball events */}
                        {[...(match.ball_events || [])].reverse().map((b: any, i: number) => (
                            <Card key={i} style={{ marginBottom: 8 }}>
                                <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 50 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{Math.floor(b.ball_number > 6 ? (b.over_number + 1) : b.over_number)}.{b.ball_number > 6 ? 6 : b.ball_number}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text>
                                            {b.bowler?.name} to {b.striker?.name}
                                        </Text>
                                        <Text style={{ color: 'gray', fontSize: 12 }}>
                                            {b.is_wicket ? `OUT! ${b.wicket_type || ''}` :
                                                b.runs_scored === 4 ? "FOUR Runs" :
                                                    b.runs_scored === 6 ? "SIX Runs" :
                                                        `${b.runs_scored} Run(s)`}
                                            {b.extras > 0 ? ` + ${b.extras} ${b.extra_type}` : ''}
                                        </Text>
                                    </View>
                                    <View>
                                        <Avatar.Text size={30} label={b.is_wicket ? 'W' : (b.runs_scored + b.extras).toString()}
                                            style={{ backgroundColor: b.is_wicket ? '#ef5350' : (b.runs_scored >= 4 ? '#66bb6a' : '#bdbdbd') }} />
                                    </View>
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: { padding: 10, paddingBottom: 50 },
    card: { marginBottom: 15, backgroundColor: 'white' },
    scoreRow: { flexDirection: 'row', justifyContent: 'space-between' }
});

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

    const innings1 = match.innings1 || match.stats?.innings1 || {};
    const innings2 = match.innings2 || match.stats?.innings2 || {};

    const renderSummary = () => {
        const teamAName = match.match?.team_a?.name || match.team_a?.name || 'Team A';
        const teamBName = match.match?.team_b?.name || match.team_b?.name || 'Team B';
        const resultDesc = match.match?.result_description || match.result_description || 'Match in Progress';
        const motm = match.match?.man_of_the_match || match.man_of_the_match;

        const i1Runs = innings1.totalRuns !== undefined ? innings1.totalRuns : 0;
        const i1Wkts = innings1.totalWickets !== undefined ? innings1.totalWickets : 0;
        const i1Overs = innings1.overs || '0.0';

        const i2Runs = innings2.totalRuns !== undefined ? innings2.totalRuns : 0;
        const i2Wkts = innings2.totalWickets !== undefined ? innings2.totalWickets : 0;
        const i2Overs = innings2.overs || '0.0';

        return (
            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 10 }}>Match Result</Text>
                        <Text variant="headlineSmall" style={{ textAlign: 'center', fontWeight: 'bold', color: theme.colors.primary }}>
                            {resultDesc}
                        </Text>
                        {motm && (
                            <View style={{ alignItems: 'center', marginTop: 15 }}>
                                <Text variant="labelMedium">Player of the Match</Text>
                                <Avatar.Text size={48} label={motm.name.substring(0, 2).toUpperCase()} style={{ marginTop: 5 }} />
                                <Text variant="titleMedium" style={{ marginTop: 5, fontWeight: 'bold' }}>{motm.name}</Text>
                            </View>
                        )}
                    </Card.Content>
                </Card>

                <View style={styles.scoreRow}>
                    <Card style={{ flex: 1, marginRight: 5 }}>
                        <Card.Content style={{ alignItems: 'center' }}>
                            <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>{innings1.battingTeam || teamAName}</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#1E3A8A' }}>
                                {i1Runs}/{i1Wkts}
                            </Text>
                            <Text variant="bodySmall" style={{ color: '#666' }}>({i1Overs} ov)</Text>
                        </Card.Content>
                    </Card>
                    <Card style={{ flex: 1, marginLeft: 5 }}>
                        <Card.Content style={{ alignItems: 'center' }}>
                            <Text variant="labelSmall" style={{ fontWeight: 'bold' }}>{innings2.battingTeam || teamBName}</Text>
                            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#1E3A8A' }}>
                                {i2Runs}/{i2Wkts}
                            </Text>
                            <Text variant="bodySmall" style={{ color: '#666' }}>({i2Overs} ov)</Text>
                        </Card.Content>
                    </Card>
                </View>
            </ScrollView>
        );
    };

    const renderScorecard = (inningsData: any, teamName: string) => {
        const battingList = Array.isArray(inningsData?.batting) 
            ? inningsData.batting 
            : Object.entries(inningsData?.batting || {}).map(([id, s]: any) => ({ id, name: `Player ${id}`, ...s }));
        
        const bowlingList = Array.isArray(inningsData?.bowling) 
            ? inningsData.bowling 
            : Object.entries(inningsData?.bowling || {}).map(([id, s]: any) => ({ id, name: `Bowler ${id}`, ...s }));

        return (
            <Card style={styles.card}>
                <Card.Title 
                    title={`${teamName} Innings`} 
                    subtitle={inningsData?.totalRuns !== undefined ? `${inningsData.totalRuns}/${inningsData.totalWickets} (${inningsData.overs} Ov, RR: ${inningsData.runRate})` : ''}
                />
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title style={{ flex: 3 }}>Batter</DataTable.Title>
                        <DataTable.Title numeric>R</DataTable.Title>
                        <DataTable.Title numeric>B</DataTable.Title>
                        <DataTable.Title numeric>4s</DataTable.Title>
                        <DataTable.Title numeric>6s</DataTable.Title>
                    </DataTable.Header>

                    {battingList.map((player: any) => (
                        <DataTable.Row key={player.id}>
                            <DataTable.Cell style={{ flex: 3 }}>
                                <View>
                                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{player.name}</Text>
                                    {player.dismissal && <Text variant="labelSmall" style={{ color: '#888', fontSize: 10 }}>{player.dismissal}</Text>}
                                </View>
                            </DataTable.Cell>
                            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{player.runs}</Text></DataTable.Cell>
                            <DataTable.Cell numeric>{player.balls}</DataTable.Cell>
                            <DataTable.Cell numeric>{player.fours || player['4s'] || 0}</DataTable.Cell>
                            <DataTable.Cell numeric>{player.sixes || player['6s'] || 0}</DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>

                {inningsData?.extras && (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8fafc', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Extras: {inningsData.extras.total || 0}</Text>
                        <Text variant="labelSmall" style={{ color: '#666' }}>
                            (wd {inningsData.extras.wides || 0}, nb {inningsData.extras.noBalls || 0}, b {inningsData.extras.byes || 0}, lb {inningsData.extras.legByes || 0})
                        </Text>
                    </View>
                )}

                <Divider style={{ marginVertical: 10 }} />

                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title style={{ flex: 3 }}>Bowler</DataTable.Title>
                        <DataTable.Title numeric>O</DataTable.Title>
                        <DataTable.Title numeric>R</DataTable.Title>
                        <DataTable.Title numeric>W</DataTable.Title>
                    </DataTable.Header>
                    {bowlingList.map((player: any) => (
                        <DataTable.Row key={player.id}>
                            <DataTable.Cell style={{ flex: 3 }}><Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{player.name}</Text></DataTable.Cell>
                            <DataTable.Cell numeric>{player.overs}</DataTable.Cell>
                            <DataTable.Cell numeric>{player.runs}</DataTable.Cell>
                            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold', color: '#DC2626' }}>{player.wickets}</Text></DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>
            </Card>
        );
    };

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

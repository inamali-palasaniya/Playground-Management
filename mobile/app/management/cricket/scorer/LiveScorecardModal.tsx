import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, DataTable, Divider, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import apiService from '../../../../services/api.service';

interface LiveScorecardModalProps {
    visible: boolean;
    onDismiss: () => void;
    matchId: number;
}

export default function LiveScorecardModal({ visible, onDismiss, matchId }: LiveScorecardModalProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedInnings, setSelectedInnings] = useState<'1' | '2'>('1');

    useEffect(() => {
        if (visible && matchId) {
            setLoading(true);
            apiService.request<any>(`/api/matches/${matchId}/stats`)
                .then(data => {
                    setStats(data);
                    if (data?.match?.current_innings === 2) {
                        setSelectedInnings('2');
                    }
                })
                .catch(err => console.error("Scorecard fetch error:", err))
                .finally(() => setLoading(false));
        }
    }, [visible, matchId]);

    const activeInnings = selectedInnings === '1' ? stats?.innings1 : stats?.innings2;

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text variant="titleLarge" style={styles.headerTitle}>📊 Full Scorecard</Text>
                    <Button mode="text" onPress={onDismiss} compact>Close</Button>
                </View>

                {loading ? (
                    <View style={styles.center}><ActivityIndicator /></View>
                ) : !stats ? (
                    <Text style={styles.centerText}>No stats available</Text>
                ) : (
                    <ScrollView style={{ maxHeight: 500 }}>
                        <SegmentedButtons
                            value={selectedInnings}
                            onValueChange={v => setSelectedInnings(v as '1' | '2')}
                            buttons={[
                                { value: '1', label: `${stats.innings1?.battingTeam || '1st Innings'} (${stats.innings1?.totalRuns || 0}/${stats.innings1?.totalWickets || 0})` },
                                { value: '2', label: `${stats.innings2?.battingTeam || '2nd Innings'} (${stats.innings2?.totalRuns || 0}/${stats.innings2?.totalWickets || 0})`, disabled: !stats.innings2 || stats.innings2.balls === 0 && stats.innings2.totalRuns === 0 }
                            ]}
                            style={styles.segmented}
                        />

                        {activeInnings && (
                            <View style={{ marginTop: 10 }}>
                                <View style={styles.summaryBar}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                        {activeInnings.battingTeam}: {activeInnings.totalRuns}/{activeInnings.totalWickets}
                                    </Text>
                                    <Text variant="bodySmall" style={{ color: '#666' }}>
                                        ({activeInnings.overs} Ov, RR: {activeInnings.runRate})
                                    </Text>
                                </View>

                                {/* Batting Table */}
                                <Text variant="labelLarge" style={styles.subHeading}>Batting</Text>
                                <DataTable>
                                    <DataTable.Header>
                                        <DataTable.Title style={{ flex: 3 }}>Batter</DataTable.Title>
                                        <DataTable.Title numeric>R</DataTable.Title>
                                        <DataTable.Title numeric>B</DataTable.Title>
                                        <DataTable.Title numeric>4s</DataTable.Title>
                                        <DataTable.Title numeric>6s</DataTable.Title>
                                        <DataTable.Title numeric>SR</DataTable.Title>
                                    </DataTable.Header>

                                    {activeInnings.batting?.map((b: any) => (
                                        <DataTable.Row key={b.id}>
                                            <DataTable.Cell style={{ flex: 3 }}>
                                                <View>
                                                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{b.name}</Text>
                                                    <Text variant="labelSmall" style={{ color: '#888', fontSize: 10 }}>{b.dismissal}</Text>
                                                </View>
                                            </DataTable.Cell>
                                            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{b.runs}</Text></DataTable.Cell>
                                            <DataTable.Cell numeric>{b.balls}</DataTable.Cell>
                                            <DataTable.Cell numeric>{b.fours}</DataTable.Cell>
                                            <DataTable.Cell numeric>{b.sixes}</DataTable.Cell>
                                            <DataTable.Cell numeric>{b.strikeRate}</DataTable.Cell>
                                        </DataTable.Row>
                                    ))}
                                </DataTable>

                                {/* Extras */}
                                <View style={styles.extrasRow}>
                                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>Extras: {activeInnings.extras?.total || 0}</Text>
                                    <Text variant="labelSmall" style={{ color: '#666' }}>
                                        (wd {activeInnings.extras?.wides || 0}, nb {activeInnings.extras?.noBalls || 0}, b {activeInnings.extras?.byes || 0}, lb {activeInnings.extras?.legByes || 0})
                                    </Text>
                                </View>

                                <Divider style={{ marginVertical: 12 }} />

                                {/* Bowling Table */}
                                <Text variant="labelLarge" style={styles.subHeading}>Bowling</Text>
                                <DataTable>
                                    <DataTable.Header>
                                        <DataTable.Title style={{ flex: 3 }}>Bowler</DataTable.Title>
                                        <DataTable.Title numeric>O</DataTable.Title>
                                        <DataTable.Title numeric>M</DataTable.Title>
                                        <DataTable.Title numeric>R</DataTable.Title>
                                        <DataTable.Title numeric>W</DataTable.Title>
                                        <DataTable.Title numeric>Econ</DataTable.Title>
                                    </DataTable.Header>

                                    {activeInnings.bowling?.map((bw: any) => (
                                        <DataTable.Row key={bw.id}>
                                            <DataTable.Cell style={{ flex: 3 }}>
                                                <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{bw.name}</Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell numeric>{bw.overs}</DataTable.Cell>
                                            <DataTable.Cell numeric>{bw.maidens}</DataTable.Cell>
                                            <DataTable.Cell numeric>{bw.runs}</DataTable.Cell>
                                            <DataTable.Cell numeric><Text style={{ fontWeight: 'bold', color: '#D32F2F' }}>{bw.wickets}</Text></DataTable.Cell>
                                            <DataTable.Cell numeric>{bw.economy}</DataTable.Cell>
                                        </DataTable.Row>
                                    ))}
                                </DataTable>

                                {/* Fall of Wickets */}
                                {activeInnings.fallOfWickets && activeInnings.fallOfWickets.length > 0 && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text variant="labelLarge" style={styles.subHeading}>Fall of Wickets</Text>
                                        <Text variant="bodySmall" style={{ color: '#555', marginTop: 4, lineHeight: 18 }}>
                                            {activeInnings.fallOfWickets.map((f: any) => `${f.score}/${f.wicket} (${f.batsman}, ${f.over} ov)`).join(' • ')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>
                )}
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 16, margin: 16, borderRadius: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerTitle: { fontWeight: 'bold', color: '#1E3A8A' },
    center: { padding: 40, alignItems: 'center' },
    centerText: { textAlign: 'center', padding: 20, color: '#888' },
    segmented: { marginBottom: 10 },
    summaryBar: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    subHeading: { fontWeight: 'bold', color: '#1E3A8A', marginTop: 6, marginBottom: 4 },
    extrasRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 6, marginTop: 6 }
});

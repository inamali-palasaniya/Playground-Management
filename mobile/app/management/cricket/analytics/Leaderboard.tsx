import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, Text, ActivityIndicator, SegmentedButtons, Card, Avatar } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function Leaderboard() {
    const { tournamentId } = useLocalSearchParams();
    const [stats, setStats] = useState<any>({ batting: [], bowling: [] });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('batting');

    useEffect(() => {
        loadStats();
    }, [tournamentId]);

    const loadStats = async () => {
        try {
            const data = await apiService.getTournamentStats(Number(tournamentId));
            setStats(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            <View style={{ padding: 10 }}>
                <SegmentedButtons
                    value={tab}
                    onValueChange={setTab}
                    buttons={[
                        { value: 'batting', label: 'Orange Cap (Runs)', icon: 'cricket' },
                        { value: 'bowling', label: 'Purple Cap (Wkts)', icon: 'bowling' },
                    ]}
                />
            </View>

            <ScrollView>
                {tab === 'batting' ? (
                     <DataTable>
                        <DataTable.Header>
                            <DataTable.Title style={{ flex: 3 }}>Player</DataTable.Title>
                            <DataTable.Title numeric>Runs</DataTable.Title>
                            <DataTable.Title numeric>Balls</DataTable.Title>
                            <DataTable.Title numeric>4s/6s</DataTable.Title>
                        </DataTable.Header>
                        {stats.batting.map((p: any, index: number) => (
                             <DataTable.Row key={p.id}>
                                <DataTable.Cell style={{ flex: 3 }}>
                                    <Text style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>{index + 1}. {p.name}</Text>
                                </DataTable.Cell>
                                <DataTable.Cell numeric>{p.runs}</DataTable.Cell>
                                <DataTable.Cell numeric>{p.balls}</DataTable.Cell>
                                <DataTable.Cell numeric>{p.fours}/{p.sixes}</DataTable.Cell>
                            </DataTable.Row>
                        ))}
                     </DataTable>
                ) : (
                    <DataTable>
                        <DataTable.Header>
                            <DataTable.Title style={{ flex: 3 }}>Player</DataTable.Title>
                            <DataTable.Title numeric>Wkts</DataTable.Title>
                            <DataTable.Title numeric>Overs</DataTable.Title>
                            <DataTable.Title numeric>Runs</DataTable.Title>
                        </DataTable.Header>
                        {stats.bowling.map((p: any, index: number) => (
                             <DataTable.Row key={p.id}>
                                <DataTable.Cell style={{ flex: 3 }}>
                                    <Text style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>{index + 1}. {p.name}</Text>
                                </DataTable.Cell>
                                <DataTable.Cell numeric>{p.wickets}</DataTable.Cell>
                                <DataTable.Cell numeric>{p.overs}</DataTable.Cell>
                                <DataTable.Cell numeric>{p.runs}</DataTable.Cell>
                            </DataTable.Row>
                        ))}
                     </DataTable>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

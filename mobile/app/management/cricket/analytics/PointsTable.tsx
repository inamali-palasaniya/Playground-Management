import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import apiService from '../../../../services/api.service';

export default function PointsTable() {
    const { tournamentId } = useLocalSearchParams();
    const [table, setTable] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();

    useEffect(() => {
        loadTable();
    }, [tournamentId]);

    const loadTable = async () => {
        try {
            const data = await apiService.getPointsTable(Number(tournamentId));
            setTable(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator /></View>;

    return (
        <ScrollView style={styles.container}>
             <DataTable>
                <DataTable.Header>
                    <DataTable.Title style={{ flex: 3 }}>Team</DataTable.Title>
                    <DataTable.Title numeric>P</DataTable.Title>
                    <DataTable.Title numeric>W</DataTable.Title>
                    <DataTable.Title numeric>L</DataTable.Title>
                    <DataTable.Title numeric>NRR</DataTable.Title>
                    <DataTable.Title numeric>Pts</DataTable.Title>
                </DataTable.Header>

                {table.map((row) => (
                    <DataTable.Row key={row.teamId}>
                        <DataTable.Cell style={{ flex: 3 }}>{row.teamName}</DataTable.Cell>
                        <DataTable.Cell numeric>{row.played}</DataTable.Cell>
                        <DataTable.Cell numeric>{row.won}</DataTable.Cell>
                        <DataTable.Cell numeric>{row.lost}</DataTable.Cell>
                        <DataTable.Cell numeric>{row.nrr}</DataTable.Cell>
                        <DataTable.Cell numeric><Text style={{ fontWeight: 'bold' }}>{row.points}</Text></DataTable.Cell>
                    </DataTable.Row>
                ))}
            </DataTable>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

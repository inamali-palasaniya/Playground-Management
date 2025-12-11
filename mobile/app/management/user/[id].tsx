import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { Text, Avatar, Button, Card, useTheme, DataTable, FAB, ActivityIndicator, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';

// --- Sub-Components for Tabs ---

const AttendanceRoute = ({ userId }: { userId: number }) => {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.request(`/attendance/user/${userId}`)
            .then((data: any) => setAttendance(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

    return (
        <ScrollView style={styles.tabContent}>
            {attendance.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No attendance records.</Text> : (
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title>Date</DataTable.Title>
                        <DataTable.Title>In</DataTable.Title>
                        <DataTable.Title>Out</DataTable.Title>
                        <DataTable.Title numeric>Fee</DataTable.Title>
                    </DataTable.Header>
                    {attendance.map((record) => (
                        <DataTable.Row key={record.id}>
                            <DataTable.Cell>{format(new Date(record.date), 'dd/MM')}</DataTable.Cell>
                            <DataTable.Cell>{record.in_time ? format(new Date(record.in_time), 'HH:mm') : '-'}</DataTable.Cell>
                            <DataTable.Cell>{record.out_time ? format(new Date(record.out_time), 'HH:mm') : '-'}</DataTable.Cell>
                            <DataTable.Cell numeric>₹{record.daily_fee_charged || 0}</DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>
            )}
        </ScrollView>
    );
};

const LedgerRoute = ({ userId }: { userId: number }) => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const loadLedger = () => {
        apiService.request(`/payments/ledger/${userId}`)
            .then((data: any) => setLedger(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadLedger(); }, [userId]);

    return (
        <ScrollView style={styles.tabContent}>
            {ledger.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No ledger records.</Text> : (
                ledger.map((item) => (
                    <Card key={item.id} style={[styles.ledgerCard, { borderLeftColor: item.is_paid ? 'green' : 'red', borderLeftWidth: 4 }]}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text variant="titleMedium">{item.type.replace('_', ' ')}</Text>
                                    <Text variant="bodySmall">{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                                    {item.notes && <Text variant="bodySmall" style={{ color: 'gray' }}>{item.notes}</Text>}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text variant="titleMedium" style={{ color: item.type === 'PAYMENT' ? 'green' : 'black' }}>
                                        {item.type === 'PAYMENT' ? '-' : '+'}₹{item.amount}
                                    </Text>
                                    <Text variant="labelSmall" style={{ color: item.is_paid ? 'green' : 'red' }}>
                                        {item.is_paid ? 'PAID' : 'UNPAID'}
                                    </Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                ))
            )}
        </ScrollView>
    );
};


export default function UserDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();
    const layout = useWindowDimensions();
    const [user, setUser] = useState<any>(null);
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'attendance', title: 'Attendance' },
        { key: 'ledger', title: 'Ledger' },
    ]);

    useEffect(() => {
        if (id) {
            apiService.getUserById(Number(id)).then((data: any) => setUser(data));
        }
    }, [id]);

    const renderScene = SceneMap({
        attendance: () => <AttendanceRoute userId={Number(id)} />,
        ledger: () => <LedgerRoute userId={Number(id)} />,
    });

    if (!user) return <View style={styles.loadingContainer}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            {/* Header Profile */}
            <View style={styles.profileHeader}>
                <IconButton icon="arrow-left" iconColor="white" onPress={() => router.back()} style={{ position: 'absolute', top: 40, left: 10, zIndex: 10 }} />
                <Avatar.Text size={80} label={user.name.substring(0, 2).toUpperCase()} style={{ backgroundColor: 'white' }} color={theme.colors.primary} />
                <Text variant="headlineMedium" style={{ color: 'white', marginTop: 10 }}>{user.name}</Text>
                <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>{user.email || user.phone}</Text>
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Button mode="contained" buttonColor="white" textColor={theme.colors.primary} style={{ marginRight: 10 }} onPress={() => { /* Add Fine Modal */ alert('Open Fine Modal'); }}>
                        Add Fine
                    </Button>
                    <Button mode="contained" buttonColor="#4caf50" textColor="white" onPress={() => { /* Add Payment Modal */ alert('Open Payment Modal'); }}>
                        Payment
                    </Button>
                </View>
            </View>

            {/* Tabs */}
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={props => <TabBar {...props} indicatorStyle={{ backgroundColor: theme.colors.primary }} style={{ backgroundColor: 'white' }} labelStyle={{ color: 'black' }} />}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    profileHeader: {
        backgroundColor: '#6200ee',
        paddingTop: 60,
        paddingBottom: 30,
        alignItems: 'center',
    },
    tabContent: {
        flex: 1,
        padding: 16,
    },
    ledgerCard: {
        marginBottom: 10,
        backgroundColor: 'white',
    }
});

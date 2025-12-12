import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert, Platform } from 'react-native';
import { Text, Avatar, Button, Card, useTheme, DataTable, FAB, ActivityIndicator, IconButton, Portal, Dialog, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

// --- Sub-Components for Tabs ---

const FineRoute = ({ userId }: { userId: number }) => {
    const [fines, setFines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadFines = () => {
        apiService.getUserLedger(userId)
            .then(data => setFines(data.filter((l: any) => l.type === 'FINE' || l.type === 'USER_FINE_LEGACY')))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadFines(); }, [userId]);

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Fine', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await apiService.deleteLedgerEntry(id);
                    loadFines();
                }
            }
        ]);
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.tabContent}>
                {fines.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No fines found.</Text> : (
                    fines.map((item) => (
                        <Card key={item.id} style={[styles.ledgerCard, { borderLeftColor: 'red', borderLeftWidth: 4 }]}>
                            <Card.Content>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text variant="titleMedium">{item.transaction_type} - {item.type}</Text>
                                        <Text variant="bodySmall">{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                                        <Text>₹{item.amount}</Text>
                                    </View>
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(item.id)} />
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>
            <FAB icon="plus" style={styles.fab} onPress={() => router.push({ pathname: '/management/apply-fine', params: { userId } })} label="Apply Fine" />
        </View>
    );
};

const LedgerRoute = ({ userId }: { userId: number }) => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editNote, setEditNote] = useState('');

    const loadLedger = () => {
        apiService.getUserLedger(userId)
            .then(data => setLedger(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }

    useEffect(() => { loadLedger(); }, [userId]);

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Entry', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await apiService.deleteLedgerEntry(id);
                        loadLedger();
                    } catch (e) { alert('Failed to delete'); }
                }
            }
        ]);
    };

    const handleEditStart = (item: any) => {
        setEditingItem(item);
        setEditNote(item.notes || '');
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            await apiService.updateLedgerEntry(editingItem.id, { notes: editNote });
            setEditingItem(null);
            loadLedger();
        } catch (e) {
            Alert.alert('Error', 'Failed to update note');
        }
    };

    return (
        <>
            <ScrollView style={styles.tabContent}>
                {ledger.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No ledger records.</Text> : (
                    ledger.map((item) => (
                        <Card key={item.id} style={[styles.ledgerCard, { borderLeftColor: item.is_paid ? 'green' : 'red', borderLeftWidth: 4 }]}>
                            <Card.Content>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="titleMedium">{item.type.replace('_', ' ')}</Text>
                                        <Text variant="bodySmall">{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                                        {item.notes && <Text variant="bodySmall" style={{ color: 'gray' }}>{item.notes}</Text>}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text variant="titleMedium" style={{ color: item.type === 'PAYMENT' || item.transaction_type === 'CREDIT' ? 'green' : 'black' }}>
                                            {item.transaction_type === 'CREDIT' ? '-' : '+'}₹{item.amount}
                                        </Text>
                                        <Text variant="labelSmall" style={{ color: item.is_paid ? 'green' : 'red' }}>
                                            {item.is_paid ? 'PAID' : 'UNPAID'}
                                        </Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            <IconButton icon="pencil" size={20} onPress={() => handleEditStart(item)} />
                                            <IconButton icon="delete" size={20} iconColor="red" onPress={() => handleDelete(item.id)} />
                                        </View>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>

            <Portal>
                <Dialog visible={!!editingItem} onDismiss={() => setEditingItem(null)}>
                    <Dialog.Title>Update Note</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Note"
                            value={editNote}
                            onChangeText={setEditNote}
                            mode="outlined"
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setEditingItem(null)}>Cancel</Button>
                        <Button onPress={handleSaveEdit}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </>
    );
};

const AttendanceRoute = ({ userId }: { userId: number }) => {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCheckInDialog, setShowCheckInDialog] = useState(false);
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const loadAttendance = () => {
        apiService.getUserAttendance(userId)
            .then((data: any) => setAttendance(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadAttendance();
    }, [userId]);

    const handleCheckIn = async () => {
        try {
            await apiService.checkIn(userId, checkInDate.toISOString());
            setShowCheckInDialog(false);
            loadAttendance();
            Alert.alert('Success', 'Check-in recorded');
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Check-in failed');
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const newDate = new Date(selectedDate);
            // Preserve time
            newDate.setHours(checkInDate.getHours(), checkInDate.getMinutes());
            setCheckInDate(newDate);
        }
    };

    const handleTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(false);
        if (selectedDate) {
            const newDate = new Date(checkInDate);
            newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            setCheckInDate(newDate);
        }
    };

    return (
        <View style={{ flex: 1 }}>
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

            <FAB
                icon="account-clock"
                label="Manual Check-In"
                style={styles.fab}
                onPress={() => {
                    setCheckInDate(new Date());
                    setShowCheckInDialog(true);
                }}
            />

            <Portal>
                <Dialog visible={showCheckInDialog} onDismiss={() => setShowCheckInDialog(false)}>
                    <Dialog.Title>Manual Check-In</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 10 }}>Select Date & Time:</Text>

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                                {format(checkInDate, 'dd MMM yyyy')}
                            </Button>
                            <Button mode="outlined" onPress={() => setShowTimePicker(true)}>
                                {format(checkInDate, 'HH:mm')}
                            </Button>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={checkInDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                            />
                        )}
                        {showTimePicker && (
                            <DateTimePicker
                                value={checkInDate}
                                mode="time"
                                display="default"
                                onChange={handleTimeChange}
                            />
                        )}
                        <Text variant="bodySmall">Note: This will spark a daily fee charge if applicable.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowCheckInDialog(false)}>Cancel</Button>
                        <Button onPress={handleCheckIn}>Check In</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
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
        { key: 'ledger', title: 'Ledger' },
        { key: 'fine', title: 'Fines' },
        { key: 'attendance', title: 'Attendance' },
    ]);

    useEffect(() => {
        if (id) {
            apiService.getUserById(Number(id)).then((data: any) => setUser(data));
        }
    }, [id]);

    const renderScene = SceneMap({
        ledger: () => <LedgerRoute userId={Number(id)} />,
        fine: () => <FineRoute userId={Number(id)} />,
        attendance: () => <AttendanceRoute userId={Number(id)} />,
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

                {/* Actions Row */}
                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                    <Button mode="contained" buttonColor="#4caf50" textColor="white" style={{ marginRight: 10 }} onPress={() => router.push({ pathname: '/management/add-payment', params: { userId: user.id, userName: user.name } })}>
                        Add Payment
                    </Button>
                    <Button mode="outlined" textColor="white" style={{ borderColor: 'white' }} onPress={async () => {
                        try {
                            await apiService.chargeMonthlyFee(user.id);
                            Alert.alert('Success', 'Monthly fee charged successfully!');
                        } catch (e: any) { Alert.alert('Error', e.message || 'Error charging fee'); }
                    }}>
                        Charge Monthly
                    </Button>
                </View>
            </View>

            {/* Tabs */}
            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={props => <TabBar {...props} indicatorStyle={{ backgroundColor: theme.colors.primary }} style={{ backgroundColor: 'white' }} activeColor="black" inactiveColor="gray" />}
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
        paddingBottom: 20,
        alignItems: 'center',
    },
    tabContent: {
        flex: 1,
        padding: 16,
    },
    ledgerCard: {
        marginBottom: 10,
        backgroundColor: 'white',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#6200ee'
    }
});

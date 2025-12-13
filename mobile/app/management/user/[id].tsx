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
    const router = useRouter();


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
        router.push({
            pathname: '/management/add-payment',
            params: {
                editId: item.id,
                userId: userId,
                initialAmount: item.amount,
                initialNotes: item.notes,
                initialDate: item.date,
                initialType: item.type,
                initialMethod: item.payment_method,
                initialTxType: item.transaction_type
            }
        });
    };

    // Process Hierarchy
    const ledgerMap = new Map();
    const rootItems: any[] = [];

    // First pass: Index all
    ledger.forEach(item => ledgerMap.set(item.id, { ...item, children: [] }));

    // Second pass: Associate
    ledger.forEach(item => {
        if (item.parent_ledger_id && ledgerMap.has(item.parent_ledger_id)) {
            ledgerMap.get(item.parent_ledger_id).children.push(ledgerMap.get(item.id));
        } else if (!item.parent_ledger_id) {
            // Potentially a root item (Debit or Unlinked Credit)
            // But wait, if an item IS a child, we shouldn't add it to rootItems yet?
        }
    });

    // We need to iterate the original list (sorted by time) to maintain order, ignoring those that are children
    ledger.forEach(item => {
        if (!item.parent_ledger_id) {
            rootItems.push(ledgerMap.get(item.id));
        }
    });

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.tabContent}>
                {ledger.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No ledger records.</Text> : (
                    rootItems.map((item) => (
                        <Card
                            key={item.id}
                            style={[styles.ledgerCard, { borderLeftColor: item.is_paid ? 'green' : 'red', borderLeftWidth: 4 }]}
                            onPress={() => router.push({ pathname: '/management/ledger/[id]', params: { id: item.id, userId } })}
                        >
                            <Card.Content>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text variant="titleMedium">{item.type.replace('_', ' ')} <Text style={{ fontSize: 12, color: 'gray' }}>#{item.id}</Text></Text>
                                        <Text variant="bodySmall">{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                                        {item.notes && <Text variant="bodySmall" style={{ color: 'gray' }}>{item.notes}</Text>}

                                        {/* Children (Payments) */}
                                        {item.children && item.children.length > 0 && (
                                            <View style={{ marginTop: 8, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#eee' }}>
                                                {item.children.map((child: any) => (
                                                    <View key={child.id} style={{ marginBottom: 4 }}>
                                                        <Text variant="bodySmall" style={{ color: 'green' }}>
                                                            Paid ₹{child.amount} on {format(new Date(child.date), 'dd MMM')} <Text style={{ fontSize: 10, color: '#ccc' }}>PMT-{child.id}</Text>
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text variant="titleMedium" style={{ color: item.type === 'PAYMENT' || item.transaction_type === 'CREDIT' ? 'green' : 'black' }}>
                                            {item.transaction_type === 'CREDIT' ? '-' : '+'}₹{item.amount}
                                        </Text>
                                        <Text variant="labelSmall" style={{ color: item.is_paid ? 'green' : 'red' }}>
                                            {item.is_paid ? 'PAID' : 'UNPAID'}
                                        </Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                            {/* Pay Button for Unpaid Debits */}
                                            {!item.is_paid && item.transaction_type === 'DEBIT' && (
                                                <Button
                                                    mode="contained"
                                                    compact
                                                    labelStyle={{ fontSize: 10, marginVertical: 2 }}
                                                    style={{ marginRight: 8, height: 24 }}
                                                    onPress={() => router.push({
                                                        pathname: '/management/add-payment',
                                                        params: {
                                                            userId,
                                                            userName: 'User',
                                                            linkedChargeId: item.id,
                                                            linkedAmount: item.amount,
                                                            linkedType: item.type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PAYMENT'
                                                        }
                                                    })}
                                                >
                                                    Pay
                                                </Button>
                                            )}

                                            <IconButton icon="pencil" size={18} onPress={() => handleEditStart(item)} />
                                            <IconButton icon="delete" size={18} iconColor="red" onPress={() => handleDelete(item.id)} />
                                        </View>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>
        </View>
    );
};


const AttendanceRoute = ({ userId }: { userId: number }) => {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Check-In State
    const [showCheckInDialog, setShowCheckInDialog] = useState(false);
    const [checkInDate, setCheckInDate] = useState(new Date());

    // Edit State
    const [editingRecord, setEditingRecord] = useState<any>(null);
    const [editInTime, setEditInTime] = useState(new Date());
    const [editOutTime, setEditOutTime] = useState<Date | null>(null);
    const [editFee, setEditFee] = useState('');

    // Pickers
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [pickerTarget, setPickerTarget] = useState<'checkin' | 'edit_in' | 'edit_out'>('checkin');

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
            let errorMessage = 'Check-in failed';
            let existingDetails = '';

            // Parse error body if available
            if (e.body) {
                try {
                    const parsed = JSON.parse(e.body);
                    if (parsed.error) errorMessage = parsed.error;
                    if (parsed.existing) {
                        const inT = parsed.existing.in_time ? format(new Date(parsed.existing.in_time), 'HH:mm') : '-';
                        const outT = parsed.existing.out_time ? format(new Date(parsed.existing.out_time), 'HH:mm') : '-';
                        existingDetails = `\nExisting: In: ${inT}, Out: ${outT}`;
                    }
                } catch (jsonErr) {
                    errorMessage = e.body;
                }
            }

            if (errorMessage.includes('Already checked in')) {
                Alert.alert('Duplicate Attendance', `${errorMessage}${existingDetails}\n\nYou can edit the existing record instead.`);
            } else {
                Alert.alert('Error', errorMessage);
             }
        }
    };

    const handleEditStart = (record: any) => {
        setEditingRecord(record);
        setEditInTime(record.in_time ? new Date(record.in_time) : new Date());
        setEditOutTime(record.out_time ? new Date(record.out_time) : null);
        setEditFee(record.daily_fee_charged ? record.daily_fee_charged.toString() : '');
    };

    const handleUpdateAttendance = async () => {
        if (!editingRecord) return;

        // Validation: In < Out
        if (editOutTime) {
            if (editOutTime.getTime() <= editInTime.getTime()) {
                Alert.alert('Invalid Time', 'Out time must be after In time.');
                return;
            }
        }

        try {
            await apiService.updateAttendance(editingRecord.id, {
                in_time: editInTime.toISOString(),
                out_time: editOutTime ? editOutTime.toISOString() : null,
                daily_fee_charged: editFee ? parseFloat(editFee) : 0,
                is_present: true // assume present if editing times
            });
            setEditingRecord(null);
            loadAttendance();
            Alert.alert('Success', 'Attendance updated');
        } catch (e: any) {
            Alert.alert('Error', 'Failed to update attendance');
        }
    };

    const showPicker = (mode: 'date' | 'time', target: 'checkin' | 'edit_in' | 'edit_out') => {
        setPickerMode(mode);
        setPickerTarget(target);
        setShowDatePicker(true); // Using single state for visibility, though name is showDatePicker
    };

    const handlePickerChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (!selectedDate) return;

        if (pickerTarget === 'checkin') {
            const newDate = new Date(checkInDate);
            if (pickerMode === 'date') {
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            } else {
                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            }
            setCheckInDate(newDate);
        } else if (pickerTarget === 'edit_in') {
            const newDate = new Date(editInTime);
            if (pickerMode === 'date') {
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            } else {
                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            }
            setEditInTime(newDate);
        } else if (pickerTarget === 'edit_out') {
            const base = editOutTime || new Date();
            const newDate = new Date(base);
            if (pickerMode === 'date') {
                newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            } else {
                newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
            }
            setEditOutTime(newDate);
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
                            <DataTable.Title numeric>Actions</DataTable.Title>
                        </DataTable.Header>
                        {attendance.map((record) => (
                            <DataTable.Row key={record.id}>
                                <DataTable.Cell>{format(new Date(record.date), 'dd/MM')}</DataTable.Cell>
                                <DataTable.Cell>{record.in_time ? format(new Date(record.in_time), 'HH:mm') : '-'}</DataTable.Cell>
                                <DataTable.Cell>{record.out_time ? format(new Date(record.out_time), 'HH:mm') : '-'}</DataTable.Cell>
                                <DataTable.Cell numeric>₹{record.daily_fee_charged || 0}</DataTable.Cell>
                                <DataTable.Cell numeric>
                                    <View style={{ flexDirection: 'row' }}>
                                        <IconButton icon="pencil" size={18} onPress={() => handleEditStart(record)} />
                                        <IconButton icon="delete" size={18} iconColor="red" onPress={() => {
                                            Alert.alert('Delete', 'Delete attendance?', [
                                                { text: 'Cancel' },
                                                {
                                                    text: 'Delete', style: 'destructive', onPress: async () => {
                                                        await apiService.deleteAttendance(record.id);
                                                        loadAttendance();
                                                    }
                                                }
                                            ]);
                                        }} />
                                    </View>
                                </DataTable.Cell>
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

            {/* Check In Dialog */}
            <Portal>
                <Dialog visible={showCheckInDialog} onDismiss={() => setShowCheckInDialog(false)}>
                    <Dialog.Title>Manual Check-In</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 10 }}>Select Date & Time:</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <Button mode="outlined" onPress={() => showPicker('date', 'checkin')}>
                                {format(checkInDate, 'dd MMM yyyy')}
                            </Button>
                            <Button mode="outlined" onPress={() => showPicker('time', 'checkin')}>
                                {format(checkInDate, 'HH:mm')}
                            </Button>
                        </View>
                        <Text variant="bodySmall">Note: This will spark a daily fee charge if applicable.</Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setShowCheckInDialog(false)}>Cancel</Button>
                        <Button onPress={handleCheckIn}>Check In</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Edit Dialog */}
            <Portal>
                <Dialog visible={!!editingRecord} onDismiss={() => setEditingRecord(null)}>
                    <Dialog.Title>Edit Attendance</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="labelLarge" style={{ marginTop: 10 }}>In Time</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <Button mode="outlined" onPress={() => showPicker('date', 'edit_in')}>
                                {format(editInTime, 'dd MMM')}
                            </Button>
                            <Button mode="outlined" onPress={() => showPicker('time', 'edit_in')}>
                                {format(editInTime, 'HH:mm')}
                            </Button>
                        </View>

                        <Text variant="labelLarge" style={{ marginTop: 10 }}>Out Time</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                            {editOutTime ? (
                                <>
                                    <Button mode="outlined" onPress={() => showPicker('date', 'edit_out')}>
                                        {format(editOutTime, 'dd MMM')}
                                    </Button>
                                    <Button mode="outlined" onPress={() => showPicker('time', 'edit_out')}>
                                        {format(editOutTime, 'HH:mm')}
                                    </Button>
                                    <IconButton icon="close-circle" onPress={() => setEditOutTime(null)} />
                                </>
                            ) : (
                                <Button mode="outlined" onPress={() => setEditOutTime(new Date())}>Set Out Time</Button>
                            )}
                        </View>

                        <TextInput
                            label="Daily Fee Charged (₹)"
                            value={editFee}
                            onChangeText={setEditFee}
                            keyboardType="numeric"
                            mode="outlined"
                            style={{ marginTop: 10 }}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setEditingRecord(null)}>Cancel</Button>
                        <Button onPress={handleUpdateAttendance}>Save Changes</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Shared DatePicker */}
            {showDatePicker && (
                <DateTimePicker
                    value={
                        pickerTarget === 'checkin' ? checkInDate :
                            pickerTarget === 'edit_in' ? editInTime :
                                (editOutTime || new Date())
                    }
                    mode={pickerMode}
                    display="default"
                    onChange={handlePickerChange}
                />
            )}
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

                {/* Financial Summary */}
                {user.balance !== undefined && (
                    <View style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 }}>
                        <Text variant="titleMedium" style={{ color: 'white', fontWeight: 'bold' }}>
                            {user.balance > 0 ? `Total Payable: ₹${user.balance}` :
                                user.balance < 0 ? `Advance Credit: ₹${Math.abs(user.balance)}` :
                                    'Account Settled'}
                        </Text>
                    </View>
                )}

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

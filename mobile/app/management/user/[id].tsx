import React, { useState, useEffect, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert, Platform } from 'react-native';
import { Text, Avatar, Button, Card, useTheme, DataTable, FAB, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Menu, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { PermissionSelector } from '../../../components/PermissionSelector';
import { generateReceipt } from '../../../utils/receiptGenerator';
import { useAuth } from '../../../context/AuthContext';

// --- Sub-Components for Tabs ---

const PermissionsRoute = ({ userId, permissions, onUpdate, canEdit, userRole }: { userId: number, permissions: any[], onUpdate: () => void, canEdit: boolean, userRole?: string }) => {
    const [saving, setSaving] = useState(false);

    const isSuperAdmin = userRole === 'SUPER_ADMIN';

    const handleSave = async (updatedPermissions: any[]) => {
        if (!canEdit || isSuperAdmin) return;
        setSaving(true);
        try {
            await apiService.updateUser(userId, { permissions: updatedPermissions });
            onUpdate();
            Alert.alert('Success', 'Permissions updated');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to update permissions');
        } finally {
            setSaving(false);
        }
    };

    if (isSuperAdmin) {
        return (
            <ScrollView style={styles.tabContent}>
                <View style={{ padding: 16, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="shield-crown" size={64} color="gold" />
                    <Text variant="titleMedium" style={{ marginTop: 10, fontWeight: 'bold' }}>Success Admin Access</Text>
                    <Text style={{ textAlign: 'center', color: 'gray', marginTop: 5 }}>
                        This user is a Super Admin and has full access to all features.
                        Permissions cannot be modified.
                    </Text>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView style={styles.tabContent}>
            <View style={{ padding: 16 }}>
                <PermissionSelector
                    permissions={permissions || []}
                    onChange={handleSave}
                    readonly={!canEdit}
                />
                {canEdit && <Text style={{ textAlign: 'center', marginTop: 10, color: 'gray' }}>Tap icons to toggle permissions immediately.</Text>}
            </View>
        </ScrollView>
    );
};

const FineRoute = ({ userId, isFocused, userRole }: { userId: number, isFocused: boolean, userRole?: string }) => {
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
                                        <Text variant="bodySmall" style={{ color: '#8b8b8b', fontStyle: 'italic' }}>
                                            By: {item.created_by?.name || 'Admin'}
                                        </Text>
                                    </View>
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(item.id)} />
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>
            {isFocused && (userRole !== 'NORMAL') && (
                <FAB icon="plus" color="white" style={styles.fab} onPress={() => router.push({ pathname: '/management/apply-fine', params: { userId } })} label="Apply Fine" visible={isFocused} />
            )}
        </View>
    );
};

const LedgerRoute = ({ userId, isFocused, userRole }: { userId: number, isFocused: boolean, userRole?: string }) => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fabOpen, setFabOpen] = useState(false);
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

    const handleReceipt = async (item: any) => {
        try {
            // Prepare data
            // If it's a payment, showing what it paid off (children) is nice.
            // If it's a root charge, showing payment status is nice.

            const items = [];
            // If it has children (allocations), list them
            // Schema relation is child_ledger but fetched as child_ledger
            // Check if frontend receives 'children' or 'child_ledger'
            // Prisma sends what is included. So it will be 'child_ledger'.
            const children = item.child_ledger || item.children;

            if (children && children.length > 0) {
                children.forEach((c: any) => {
                    items.push({ description: `Payment: ${c.type}`, amount: c.amount, date: c.date, ref: `PMT-${c.id}` });
                });
            } else {
                // Determine description
                const desc = item.notes || item.type.replace('_', ' ');
                items.push({ description: desc, amount: item.amount, date: item.date, ref: `${item.transaction_type.substring(0, 3)}-${item.id}` });
            }

            // If it's a payment record itself (child logic handled if we clicked parent charge?)
            // If we click a PAYMENT record (which is usually a child in my UI logic? No, root items are Charges OR Unlinked Payments).
            // If transaction_type is CREDIT (Payment), it's a Receipt.
            // If DEBIT (Charge), it's an Invoice.

            const type = item.transaction_type === 'CREDIT' ? 'PAYMENT' : 'CHARGE';

            await generateReceipt({
                title: type === 'PAYMENT' ? 'Payment Receipt' : 'Invoice',
                userName: 'User', // In real app, pass user name prop to LedgerRoute or fetch it
                id: item.id,
                date: item.date,
                totalAmount: item.amount,
                items: items,
                transactionType: type,
                userPhone: '' // Pass if available
            });
        } catch (e: any) {
            Alert.alert('Error', e.message);
        }
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
                                        <Text variant="bodySmall" style={{ color: '#8b8b8b', fontStyle: 'italic', marginTop: 2 }}>
                                            By: {item.created_by?.name || 'Admin'}
                                        </Text>
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
                                            {!item.is_paid && item.transaction_type === 'DEBIT' && userRole !== 'NORMAL' && (
                                                <Button
                                                    mode="contained"
                                                    compact
                                                    labelStyle={{ fontSize: 10, marginVertical: 2, color: 'white' }}
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

                                            {userRole !== 'NORMAL' && <IconButton icon="pencil" size={18} onPress={() => handleEditStart(item)} />}
                                            <IconButton icon="file-document-outline" size={18} iconColor="#1565c0" onPress={() => handleReceipt(item)} />
                                            {userRole !== 'NORMAL' && <IconButton icon="delete" size={18} iconColor="red" onPress={() => handleDelete(item.id)} />}
                                        </View>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </ScrollView>
            {userRole !== 'NORMAL' && (
                <Portal>
                    <FAB.Group
                        open={fabOpen}
                        visible={isFocused} // Only visible when screen is focused
                        icon={fabOpen ? 'close' : 'plus'}
                        actions={[
                            {
                                icon: 'cash-plus',
                                label: 'Add Payment',
                                onPress: () => router.push({ pathname: '/management/add-payment', params: { userId, initialTxType: 'CREDIT' } }),
                            },
                            {
                                icon: 'cash-minus',
                                label: 'Add Charge',
                                onPress: () => router.push({ pathname: '/management/add-payment', params: { userId, initialTxType: 'DEBIT' } }),
                            },
                        ]}
                        onStateChange={({ open }) => setFabOpen(open)}
                        style={{ paddingBottom: 60 }}
                    />
                </Portal>
            )}
        </View>
    );
};


const AttendanceRoute = ({ userId, isFocused, onUpdate, userRole }: { userId: number, isFocused: boolean, onUpdate?: () => void, userRole?: string }) => {
    const isNormalUser = userRole === 'NORMAL';
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
        apiService.getUserAttendance(userId) // Skip loader here? Maybe not, it's tab content.
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
            if (onUpdate) onUpdate();
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
            if (onUpdate) onUpdate();
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
                            {!isNormalUser && <DataTable.Title numeric>Actions</DataTable.Title>}
                        </DataTable.Header>
                        {attendance.map((record) => (
                            <DataTable.Row key={record.id}>
                                <DataTable.Cell>{format(new Date(record.date), 'dd/MM')}</DataTable.Cell>
                                <DataTable.Cell>{record.in_time ? format(new Date(record.in_time), 'HH:mm') : '-'}</DataTable.Cell>
                                <DataTable.Cell>{record.out_time ? format(new Date(record.out_time), 'HH:mm') : '-'}</DataTable.Cell>
                                <DataTable.Cell numeric>₹{record.daily_fee_charged || 0}</DataTable.Cell>
                                {!isNormalUser && (
                                    <DataTable.Cell numeric>
                                        <View style={{ flexDirection: 'row' }}>
                                            <IconButton icon="pencil" size={18} onPress={() => handleEditStart(record)} />
                                            <IconButton icon="delete" size={18} iconColor="red" onPress={() => {
                                                Alert.alert('Delete', 'Delete attendance?', [
                                                    { text: 'Cancel' },
                                                    {
                                                        text: 'Delete', style: 'destructive', onPress: async () => {
                                                            try {
                                                                await apiService.deleteAttendance(record.id);
                                                                loadAttendance();
                                                                if (onUpdate) onUpdate();
                                                                Alert.alert('Success', 'Attendance deleted');
                                                            } catch (e: any) {
                                                                console.error(e);
                                                                if (e.status === 403 || (e.body && e.body.includes('Forbidden'))) { // Check for RBAC error
                                                                    Alert.alert('Permission Denied', 'Only Management can delete attendance.');
                                                                } else {
                                                                    Alert.alert('Error', 'Failed to delete attendance');
                                                                }
                                                            }
                                                        }
                                                    }
                                                ]);
                                            }} />
                                        </View>
                                    </DataTable.Cell>
                                )}
                            </DataTable.Row>
                        ))}
                    </DataTable>
                )}
            </ScrollView>

            {isFocused && (
                <FAB
                    color="white"
                    icon="account-clock"
                    label="Manual Check-In"
                    style={styles.fab}
                    onPress={() => {
                        setCheckInDate(new Date());
                        setShowCheckInDialog(true);
                    }}
                    visible={isFocused}
                />
            )}

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
    const { user: currentUser } = useAuth();
    const isFocused = useIsFocused();
    const layout = useWindowDimensions();
    const [user, setUser] = useState<any>(null);
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'ledger', title: 'Ledger' },
        { key: 'fine', title: 'Fines' },
        { key: 'attendance', title: 'Attendance' },
        { key: 'permissions', title: 'Perms' },
    ]);

    // Calculate duration
    const [todaysAttendance, setTodaysAttendance] = useState<any>(null);
    const [loggedTime, setLoggedTime] = useState("0h 00m");

    useEffect(() => {
        if (id) {
            apiService.getUserById(Number(id)).then((data: any) => setUser(data));
        }
    }, [id]);

    useEffect(() => {
        if (user?.attendances && user.attendances.length > 0) {
            setTodaysAttendance(user.attendances[0]);
        } else {
            setTodaysAttendance(null);
        }
    }, [user]);

    const calculateDuration = useCallback(() => {
        if (!todaysAttendance || !todaysAttendance.in_time) return "0h 00m";
        const start = new Date(todaysAttendance.in_time).getTime();
        const end = todaysAttendance.out_time ? new Date(todaysAttendance.out_time).getTime() : new Date().getTime();

        let diff = end - start;
        if (diff < 0) diff = 0; // Prevent negative if system time skew

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }, [todaysAttendance]);

    const isPunchIn = user?.punch_status === 'IN';

    useEffect(() => {
        setLoggedTime(calculateDuration()); // Initial update

        let interval: NodeJS.Timeout;
        if (isPunchIn) {
            interval = setInterval(() => {
                setLoggedTime(calculateDuration());
            }, 60000); // Update every minute
        }
        return () => clearInterval(interval);
    }, [isPunchIn, todaysAttendance, calculateDuration]);

    const refreshUser = useCallback(() => {
        if (id) {
            apiService.getUserById(Number(id)).then((data: any) => setUser(data));
        }
    }, [id]);

    const renderScene = ({ route }: any) => {
        const currentUserRole = currentUser?.role || 'NORMAL';
        switch (route.key) {
            case 'ledger':
                return <LedgerRoute userId={Number(id)} isFocused={isFocused} userRole={currentUserRole} />;
            case 'fine':
                return <FineRoute userId={Number(id)} isFocused={isFocused} userRole={currentUserRole} />;
            case 'attendance':
                return <AttendanceRoute userId={Number(id)} isFocused={isFocused} onUpdate={() => {
                    apiService.getUserById(Number(id)).then(setUser);
                }} />;
            case 'permissions':
                return <PermissionsRoute
                    userId={Number(id)}
                    permissions={user?.permissions || []}
                    onUpdate={() => apiService.getUserById(Number(id)).then(setUser)}
                    canEdit={currentUserRole === 'MANAGEMENT' || currentUserRole === 'SUPER_ADMIN'}
                    userRole={user?.role}
                />;
            default:
                return null;
        }
    };

    // Header Menu State
    const [menuVisible, setMenuVisible] = useState(false);
    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    if (!user) return <View style={styles.loadingContainer}><ActivityIndicator /></View>;

    return (
        <View style={styles.container}>
            {/* Header / Profile Card - Fixed Top Section */}
            <View>
                {/* Header Container */}
                <View style={styles.headerContainer}>
                    <View style={styles.topNav}>
                        <IconButton icon="arrow-left" size={24} onPress={() => router.back()} />
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
                            {user.name}
                        </Text>

                        {/* Professional Menu Action - HIDDEN FOR NORMAL USERS */}
                        {currentUser?.role !== 'NORMAL' && (
                            <View style={{ flexDirection: 'row' }}>
                                <Menu
                                    visible={menuVisible}
                                    onDismiss={closeMenu}
                                    anchor={<IconButton icon="dots-vertical" onPress={openMenu} />}
                                >
                                    <Menu.Item onPress={() => { closeMenu(); router.push({ pathname: '/management/add-payment', params: { userId: user.id } }) }} title="Add Payment" leadingIcon="cash-plus" />
                                    <Menu.Item onPress={() => { closeMenu(); router.push({ pathname: '/management/add-payment', params: { userId: user.id } }) }} title="Add Charge" leadingIcon="cash-minus" />
                                </Menu>
                            </View>
                        )}
                    </View>

                    {/* Avatar & Role */}
                    <View style={{ alignItems: 'center', marginBottom: 16 }}>
                        <Avatar.Text
                            size={80}
                            label={user.name.substring(0, 2).toUpperCase()}
                            style={{ backgroundColor: theme.colors.primary }}
                            color="white"
                        />
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role || 'User'}</Text>
                        </View>
                        {!user.is_active && (
                            <View style={{ backgroundColor: 'red', borderRadius: 4, paddingHorizontal: 8, marginTop: 4 }}>
                                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>INACTIVE</Text>
                            </View>
                        )}
                    </View>

                    {/* Status Actions */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10, gap: 10 }}>
                        <IconButton
                            icon="phone"
                            mode="contained"
                            containerColor="#e0f2f1"
                            iconColor="#00695c"
                            onPress={() => Linking.openURL(`tel:${user.phone}`)}
                            disabled={!user.phone}
                        />
                        {user.phone && (
                            <IconButton
                                icon="whatsapp"
                                mode="contained"
                                containerColor="#25D366" // WhatsApp green
                                iconColor="white"
                                size={24}
                                onPress={() => Linking.openURL(`whatsapp://send?phone=${user.phone}`)}
                            />
                        )}
                        <IconButton
                            icon="email"
                            mode="contained"
                            containerColor="#e0e0e0"
                            iconColor="#333"
                            size={24}
                            onPress={() => user.email && Linking.openURL(`mailto:${user.email}`)}
                            disabled={!user.email}
                        />
                    </View>

                </View>
                {/* Status Toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Text style={{ marginRight: 8 }}>Status:</Text>
                    {user.role === 'SUPER_ADMIN' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                            <MaterialCommunityIcons name="check-circle" size={16} color="green" />
                            <Text style={{ marginLeft: 4, color: 'green', fontWeight: 'bold' }}>Active</Text>
                        </View>
                    ) : (
                        <>
                            <Button
                                mode={user.is_active ? 'contained' : 'outlined'}
                                compact
                                buttonColor={user.is_active ? 'green' : undefined}
                                textColor={user.is_active ? 'white' : 'gray'}
                                onPress={() => {
                                    apiService.updateUser(user.id, { is_active: true } as any).then(() => refreshUser()).catch(e => Alert.alert('Error', 'Update failed'));
                                }}
                                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                            >
                                Active
                            </Button>
                            <Button
                                mode={!user.is_active ? 'contained' : 'outlined'}
                                compact
                                buttonColor={!user.is_active ? 'red' : undefined}
                                textColor={!user.is_active ? 'white' : 'gray'}
                                onPress={() => {
                                    apiService.updateUser(user.id, { is_active: false } as any).then(() => refreshUser()).catch(e => Alert.alert('Error', 'Update failed'));
                                }}
                                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                            >
                                Inactive
                            </Button>
                        </>
                    )}

                    {/* EXPIRED Banner */}
                    {user.subscription_status === 'EXPIRED' && (
                        <View style={{ backgroundColor: '#ffebee', padding: 10, marginHorizontal: 16, marginBottom: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderColor: 'red', borderWidth: 1 }}>
                            <MaterialCommunityIcons name="alert-circle" size={24} color="red" />
                            <Text style={{ marginLeft: 10, color: 'red', fontWeight: 'bold' }}>Subscription Expired! Payment Due.</Text>
                        </View>
                    )}
                </View>

                {/* Info Cards (Attendance/Subscription) - Keeping stable */}
                <View>
                    {/* Info Cards */}
                    <Card style={styles.infoCard}>
                        <Card.Content style={styles.infoRow}>
                            <MaterialCommunityIcons name="email-outline" size={20} color="#555" />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.infoLabel}>Email Address</Text>
                                <Text style={styles.infoValue}>{user.email || 'N/A'}</Text>
                            </View>
                        </Card.Content>
                        <Divider />
                        <Card.Content style={styles.infoRow}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#555" />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.infoLabel}>Phone Number</Text>
                                <Text style={styles.infoValue}>{user.phone}</Text>
                            </View>
                        </Card.Content>
                    </Card>

                    {/* Attendance Today Card */}
                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Attendance: {todaysAttendance ? (todaysAttendance.out_time ? 'COMPLETED' : 'PRESENT') : 'NOT MARKED'}</Text>
                                    {isPunchIn && <Text style={{ color: 'green', marginTop: 4 }}>Time Logged: {loggedTime}</Text>}
                                </View>
                                <Button
                                    mode="contained"
                                    buttonColor={isPunchIn ? '#d32f2f' : '#1565c0'}
                                    onPress={async () => {
                                        try {
                                            if (isPunchIn) {
                                                // Check out
                                                await apiService.checkOut(user.id);
                                                Alert.alert('Success', 'Checked Out');
                                            } else {
                                                // Quick Check In
                                                await apiService.checkIn(user.id);
                                                Alert.alert('Success', 'Checked In');
                                            }
                                            refreshUser(); // Refresh user data to update attendance status
                                        } catch (e: any) {
                                            if (e.body) {
                                                try {
                                                    const err = JSON.parse(e.body);
                                                    if (err.existing && err.existing.in_time) {
                                                        const dt = new Date(err.existing.in_time).toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
                                                        Alert.alert('Already Checked In', `You checked in today at ${dt}.\nOnly one session per day is allowed.`);
                                                        return;
                                                    }
                                                    Alert.alert('Error', err.error || 'Failed to toggle status');
                                                } catch (parseErr) {
                                                    Alert.alert('Error', 'Failed to toggle status (Parse Error)');
                                                }
                                            } else {
                                                Alert.alert('Error', 'Failed to toggle status');
                                            }
                                        }
                                    }}
                                >
                                    {isPunchIn ? 'Check Out' : 'Check In'}
                                </Button>
                            </View>
                        </Card.Content>
                    </Card>

                    {/* Financial Summary */}
                    <Card style={styles.infoCard}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="cash" size={20} color="#1565c0" />
                                    <Text style={{ marginLeft: 8, fontWeight: 'bold', fontSize: 14 }}>Monthly Subscription</Text>
                                </View>
                                <Text style={{ fontSize: 14 }}>₹{user.deposit_amount || 0}/month</Text>
                            </View>

                            {/* Progress Bar (Expenses vs Deposit) */}
                            <View style={{ height: 4, backgroundColor: '#e0e0e0', borderRadius: 2, marginVertical: 8 }}>
                                <View style={{
                                    width: `${Math.min(((user.total_debits || 0) / (user.deposit_amount || 1)) * 100, 100)}%`,
                                    height: '100%',
                                    backgroundColor: user.balance < 0 ? 'red' : '#1565c0',
                                    borderRadius: 2
                                }} />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <View>
                                    <Text style={{ fontWeight: 'bold' }}>₹{user.total_debits || 0}</Text>
                                    <Text style={{ fontSize: 10, color: '#666' }}>Total Expenses</Text>
                                </View>
                                <View>
                                    <Text style={{ fontWeight: 'bold', color: user.balance < 0 ? 'red' : 'green' }}>
                                        ₹{user.balance || 0}
                                    </Text>
                                    <Text style={{ fontSize: 10, color: '#666' }}>Current Balance</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <TabView
                    navigationState={{ index, routes }}
                    renderScene={renderScene}
                    onIndexChange={setIndex}
                    initialLayout={{ width: layout.width }}
                    renderTabBar={props => <TabBar {...props} indicatorStyle={{ backgroundColor: theme.colors.primary }} style={{ backgroundColor: 'white' }} activeColor="black" inactiveColor="gray" />}
                />
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' }, // Lighter background
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: {
        backgroundColor: '#fff',
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 40,
        paddingBottom: 10
    },
    roleBadge: {
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: -12, // overlap avatar slightly
        borderWidth: 2,
        borderColor: 'white'
    },
    roleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1565c0'
    },
    chipVip: {
        backgroundColor: '#fff3e0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center'
    },
    chipLabel: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#eee',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center'
    },
    infoCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 0,
        borderWidth: 1,
        borderColor: '#f0f0f0'
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4
    },
    infoLabel: {
        fontSize: 10,
        color: '#888'
    },
    infoValue: {
        fontSize: 14,
        color: '#333'
    },
    punchCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
    timeBarContainer: {
        marginTop: 15,
        backgroundColor: '#e3f2fd', // Light blue bg
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    // Keep legacy styles for sub-components
    tabContent: { flex: 1, padding: 16 },
    ledgerCard: { marginBottom: 10, backgroundColor: 'white' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' }
});

import React, { useState, useEffect, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, StyleSheet, ScrollView, useWindowDimensions, Alert, Platform, TouchableOpacity, StatusBar } from 'react-native';
import { Text, Avatar, Button, Card, useTheme, DataTable, FAB, ActivityIndicator, IconButton, Portal, Dialog, TextInput, Menu, Divider, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Tabs, MaterialTabBar } from 'react-native-collapsible-tab-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking } from 'react-native';
import { PermissionSelector } from '../../../components/PermissionSelector';
import { generateReceipt } from '../../../utils/receiptGenerator';
import { useAuth } from '../../../context/AuthContext';
import { AuthService } from '../../../services/auth.service';
import { LinearGradient } from 'expo-linear-gradient';

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
            <Tabs.ScrollView style={styles.tabContent}>
                <View style={{ padding: 16, alignItems: 'center' }}>
                    <MaterialCommunityIcons name="shield-crown" size={64} color="gold" />
                    <Text variant="titleMedium" style={{ marginTop: 10, fontWeight: 'bold' }}>Success Admin Access</Text>
                    <Text style={{ textAlign: 'center', color: 'gray', marginTop: 5 }}>
                        This user is a Super Admin and has full access to all features.
                        Permissions cannot be modified.
                    </Text>
                </View>
            </Tabs.ScrollView>
        );
    }

    return (
        <Tabs.ScrollView style={styles.tabContent}>
            <View style={{ padding: 16 }}>
                <PermissionSelector
                    permissions={permissions || []}
                    onChange={handleSave}
                    readonly={!canEdit}
                />
                {canEdit && <Text style={{ textAlign: 'center', marginTop: 10, color: 'gray' }}>Tap icons to toggle permissions immediately.</Text>}
            </View>
        </Tabs.ScrollView>
    );
};

const FineRoute = ({ userId, isFocused, currentUser, onUpdate }: { userId: number, isFocused: boolean, currentUser: any, onUpdate?: () => void }) => {
    const [fines, setFines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadFines = () => {
        apiService.getUserLedger(userId)
            .then(data => setFines(data.filter((l: any) => l.type === 'FINE' || l.type === 'USER_FINE_LEGACY')))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (isFocused) loadFines(); }, [userId, isFocused]);

    const handleDelete = async (id: number) => {
        Alert.alert('Delete Fine', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await apiService.deleteLedgerEntry(id);
                    loadFines();
                    if (onUpdate) onUpdate();
                }
            }
        ]);
    };

    const canDelete = AuthService.hasPermission(currentUser, 'charge', 'delete'); // Fines are charges
    const canAdd = AuthService.hasPermission(currentUser, 'charge', 'add');

    return (
        <View style={{ flex: 1 }}>
            <Tabs.ScrollView style={styles.tabContent}>
                {fines.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No fines found.</Text> : (
                    fines.map((item) => (
                        <Card key={item.id} style={styles.ledgerCard}>
                            <Card.Content style={{ paddingVertical: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <MaterialCommunityIcons name="alert-decagram" size={16} color="#d32f2f" />
                                            <Text variant="titleSmall" style={{ fontWeight: 'bold' }}>Fine</Text>
                                        </View>
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                                        <Text variant="bodySmall" style={{ color: '#999' }}>By: {item.created_by?.name || 'Admin'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text variant="titleMedium" style={{ color: '#d32f2f', fontWeight: 'bold' }}>₹{item.amount}</Text>
                                        {canDelete && <IconButton icon="delete-outline" iconColor="#d32f2f" size={20} onPress={() => handleDelete(item.id)} style={{ margin: 0 }} />}
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                )}
            </Tabs.ScrollView>
            {isFocused && canAdd && (
                <FAB icon="plus" color="white" style={styles.fab} onPress={() => router.push({ pathname: '/management/apply-fine', params: { userId } })} label="Apply Fine" visible={isFocused} />
            )}
        </View>
    );
};

const LedgerRoute = ({ userId, isFocused, currentUser, onUpdate }: { userId: number, isFocused: boolean, currentUser: any, onUpdate?: () => void }) => {
    const [ledger, setLedger] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fabOpen, setFabOpen] = useState(false);
    const router = useRouter();

    // Filters
    const [selectedType, setSelectedType] = useState('ALL');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    const loadLedger = () => {
        setLoading(true);
        const start = startDate ? startDate.toISOString().split('T')[0] : undefined;
        const end = endDate ? endDate.toISOString().split('T')[0] : undefined;

        apiService.getUserLedger(userId, start, end, selectedType)
            .then(data => setLedger(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }

    // Reload when filters change
    useEffect(() => {
        if (isFocused) loadLedger();
    }, [userId, isFocused, selectedType, startDate, endDate]);

    const clearFilters = () => {
        setSelectedType('ALL');
        setStartDate(null);
        setEndDate(null);
    };



    const handleDelete = async (id: number) => {
        Alert.alert('Delete Entry', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await apiService.deleteLedgerEntry(id);
                        loadLedger();
                        if (onUpdate) onUpdate();
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

    // Generic permissions for ledger actions
    const canAddPayment = AuthService.hasPermission(currentUser, 'payment', 'add');
    const canAddCharge = AuthService.hasPermission(currentUser, 'charge', 'add');

    return (
        <View style={{ flex: 1 }}>
            <Tabs.ScrollView style={styles.tabContent}>
                {/* Filters */}
                <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        {['ALL', 'SUBSCRIPTION', 'MONTHLY_FEE', 'FINE', 'PAYMENT', 'DEPOSIT', 'MAINTENANCE', 'OTHER'].map(type => (
                            <Chip
                                key={type}
                                selected={selectedType === type}
                                onPress={() => setSelectedType(type)}
                                style={{ marginRight: 8, backgroundColor: selectedType === type ? '#e3f2fd' : '#f5f5f5' }}
                                textStyle={{ fontSize: 12 }}
                                compact
                            >
                                {type.replace('_', ' ')}
                            </Chip>
                        ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Button mode="outlined" compact onPress={() => setShowStartPicker(true)} labelStyle={{ fontSize: 12 }}>
                            {startDate ? format(startDate, 'dd MMM') : 'From Date'}
                        </Button>
                        <Text>-</Text>
                        <Button mode="outlined" compact onPress={() => setShowEndPicker(true)} labelStyle={{ fontSize: 12 }}>
                            {endDate ? format(endDate, 'dd MMM') : 'To Date'}
                        </Button>
                        {(startDate || endDate || selectedType !== 'ALL') && (
                            <IconButton icon="close-circle-outline" size={20} onPress={clearFilters} />
                        )}
                    </View>
                </View>

                {ledger.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No ledger records found.</Text> : (
                    rootItems.map((item) => {
                        const isPayment = item.type === 'PAYMENT' || item.transaction_type === 'CREDIT';
                        const canEdit = AuthService.hasPermission(currentUser, isPayment ? 'payment' : 'charge', 'edit');
                        const canDelete = AuthService.hasPermission(currentUser, isPayment ? 'payment' : 'charge', 'delete');

                        return (
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
                                                {!item.is_paid && item.transaction_type === 'DEBIT' && canAddPayment && (
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

                                                {canEdit && <IconButton icon="pencil" size={18} onPress={() => handleEditStart(item)} />}
                                                <IconButton icon="file-document-outline" size={18} iconColor="#1565c0" onPress={() => handleReceipt(item)} />
                                                {canDelete && <IconButton icon="delete" size={18} iconColor="red" onPress={() => handleDelete(item.id)} />}
                                            </View>
                                        </View>
                                    </View>
                                </Card.Content>
                            </Card>
                        )
                    })
                )}
            </Tabs.ScrollView>
            {(canAddPayment || canAddCharge) && (
                <Portal>
                    <FAB.Group
                        open={fabOpen}
                        visible={isFocused} // Only visible when screen is focused
                        icon={fabOpen ? 'close' : 'plus'}
                        actions={[
                            ...(canAddPayment ? [{
                                icon: 'cash-plus',
                                label: 'Add Payment',
                                onPress: () => router.push({ pathname: '/management/add-payment', params: { userId, initialTxType: 'CREDIT' } }),
                            }] : []),
                            ...(canAddCharge ? [{
                                icon: 'cash-minus',
                                label: 'Add Charge',
                                onPress: () => router.push({ pathname: '/management/add-payment', params: { userId, initialTxType: 'DEBIT' } }),
                            }] : []),
                        ]}
                        onStateChange={({ open }) => setFabOpen(open)}
                        style={{ paddingBottom: 60 }}
                    />
                </Portal>
            )}

            {/* Date Pickers */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
                />
            )}
            {showEndPicker && (
                <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
                />
            )}
        </View>
    );
};


const AttendanceRoute = ({ userId, isFocused, onUpdate, currentUser }: { userId: number, isFocused: boolean, onUpdate?: () => void, currentUser: any }) => {
    const isNormalUser = currentUser?.role === 'NORMAL';
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
            const msg = e.body ? JSON.parse(e.body).error || e.message : e.message;
            Alert.alert('Error', msg || 'Failed to update attendance');
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
            <Tabs.ScrollView contentContainerStyle={{ paddingTop: 20, paddingBottom: 100, paddingHorizontal: 16 }}>
                {attendance.length === 0 ? <Text style={{ textAlign: 'center', marginTop: 20 }}>No attendance records.</Text> : (
                    <View style={{ gap: 10 }}>
                        {attendance.map((record) => (
                            <Card key={record.id} style={{ backgroundColor: 'white', elevation: 2, borderRadius: 8 }}>
                                <Card.Content style={{ paddingVertical: 10 }}>
                                    {/* Row 1: Date & Fee */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                                            {format(new Date(record.date), 'dd MMM yyyy')}
                                        </Text>
                                        <Text variant="titleSmall" style={{ fontWeight: 'bold', color: record.daily_fee_charged > 0 ? '#d32f2f' : 'green' }}>
                                            {record.daily_fee_charged > 0 ? `₹${record.daily_fee_charged}` : 'Free'}
                                        </Text>
                                    </View>
                                    <Divider style={{ marginBottom: 8 }} />

                                    {/* Row 2: In / Out Times */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="login" size={16} color="green" style={{ marginRight: 6 }} />
                                                <Text variant="bodyMedium">
                                                    {record.in_time ? format(new Date(record.in_time), 'hh:mm a') : '-'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="logout" size={16} color="orange" style={{ marginRight: 6 }} />
                                                <Text variant="bodyMedium">
                                                    {record.out_time ? format(new Date(record.out_time), 'hh:mm a') : 'Active'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Actions */}
                                        {(AuthService.hasPermission(currentUser, 'user', 'edit') || AuthService.hasPermission(currentUser, 'user', 'delete')) && (
                                            <View style={{ flexDirection: 'row' }}>
                                                {AuthService.hasPermission(currentUser, 'user', 'edit') &&
                                                    <IconButton icon="pencil" size={18} onPress={() => handleEditStart(record)} style={{ margin: 0, width: 24, height: 24 }} />
                                                }
                                                {AuthService.hasPermission(currentUser, 'user', 'delete') &&
                                                    <IconButton icon="delete" size={18} iconColor="red" style={{ margin: 0, width: 24, height: 24 }} onPress={() => {
                                                        Alert.alert('Delete', 'Delete attendance?', [
                                                            { text: 'Cancel' },
                                                            {
                                                                text: 'Delete', style: 'destructive', onPress: async () => {
                                                                    try {
                                                                        await apiService.deleteAttendance(record.id);
                                                                        loadAttendance();
                                                                        if (onUpdate) onUpdate();
                                                                    } catch (e: any) {
                                                                        const msg = e.body ? JSON.parse(e.body).error || e.message : e.message;
                                                                        Alert.alert('Error', msg);
                                                                    }
                                                                }
                                                            }
                                                        ]);
                                                    }} />
                                                }
                                            </View>
                                        )}
                                    </View>
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}
            </Tabs.ScrollView>

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


const MatchesRoute = ({ userId, isFocused }: { userId: number, isFocused: boolean }) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadMatches = useCallback(() => {
        setLoading(true);
        apiService.request<any[]>(`/api/users/${userId}/matches`)
            .then(data => setMatches(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId]);

    useEffect(() => {
        if (isFocused) {
            loadMatches();
        }
    }, [isFocused, loadMatches]);

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

    return (
        <Tabs.ScrollView style={styles.tabContent}>
            {matches.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <MaterialCommunityIcons name="cricket" size={48} color="#ccc" />
                    <Text style={{ textAlign: 'center', marginTop: 10, color: 'gray' }}>No matches played yet.</Text>
                </View>
            ) : (
                matches.map(({ match, stats }: any) => (
                    <Card key={match.id} style={{ marginBottom: 12, marginHorizontal: 16, backgroundColor: 'white', elevation: 2, borderRadius: 12 }} onPress={() => router.push({ pathname: '/management/cricket/analytics/[id]', params: { id: match.id } })}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12, justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12, color: '#666' }}>{format(new Date(match.start_time), 'dd MMM, HH:mm')}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: match.is_completed ? 'green' : 'orange', marginRight: 4 }} />
                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: match.is_completed ? 'green' : 'orange' }}>{match.is_completed ? 'FINISHED' : 'LIVE'}</Text>
                            </View>
                        </View>

                        <Card.Content style={{ paddingVertical: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{match.team_a.name}</Text>
                                </View>
                                <Text style={{ fontWeight: 'bold', color: 'gray' }}>VS</Text>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{match.team_b.name}</Text>
                                </View>
                            </View>

                            <Text style={{ textAlign: 'center', fontSize: 12, color: '#666', marginBottom: 10 }}>{match.result_description || 'Match in progress...'}</Text>

                            <View style={{ flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 8, padding: 8 }}>
                                <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#eee' }}>
                                    <Text variant="labelSmall" style={{ color: '#666' }}>BATTING</Text>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{stats.batting.runs}<Text style={{ fontSize: 12, fontWeight: 'normal' }}>/</Text>{stats.batting.balls}</Text>
                                    <Text style={{ fontSize: 10, color: 'gray' }}>Runs/Balls</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text variant="labelSmall" style={{ color: '#666' }}>BOWLING</Text>
                                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{stats.bowling.wickets}<Text style={{ fontSize: 12, fontWeight: 'normal' }}>-</Text>{stats.bowling.runs}</Text>
                                    <Text style={{ fontSize: 10, color: 'gray' }}>Wkts-Runs</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                ))
            )}
        </Tabs.ScrollView>
    );
};


export default function UserDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<any>(null);

    // Calculate duration
    const [todaysAttendance, setTodaysAttendance] = useState<any>(null);
    const [loggedTime, setLoggedTime] = useState("0h 00m");

    useFocusEffect(
        useCallback(() => {
            if (id) {
                apiService.getUserById(Number(id)).then((data: any) => setUser(data));
            }
        }, [id])
    );

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

    // Header Menu State
    const [menuVisible, setMenuVisible] = useState(false);
    const openMenu = () => setMenuVisible(true);
    const closeMenu = () => setMenuVisible(false);

    if (!user) return <View style={styles.loadingContainer}><ActivityIndicator /></View>;

    const renderHeader = () => {
        return (
            <View style={{ pointerEvents: 'box-none' }}>
                <LinearGradient
                    colors={[theme.colors.primary, '#1976d2']}
                    style={[styles.headerGradient, { paddingTop: 5 }]}
                >
                    <View style={{ paddingBottom: 10, alignItems: 'center' }}>
                        <Avatar.Text
                            size={56}
                            label={user.name.substring(0, 2).toUpperCase()}
                            style={{ backgroundColor: 'white', elevation: 4 }}
                            color={theme.colors.primary}
                            labelStyle={{ fontWeight: 'bold' }}
                        />
                        <Text variant="titleLarge" style={{ color: 'white', fontWeight: 'bold', marginTop: 4 }}>{user.name}</Text>
                        <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.9)' }}>{user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role || 'User'}</Text>
                    </View>
                </LinearGradient>

                {/* Floating Contact Card & Status */}
                <View style={styles.floatingCard}>

                    {/* Contact Details */}
                    <View style={{ marginBottom: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                            <Text variant="bodyMedium" style={{ flex: 1, color: '#333' }} onPress={() => user.phone && Linking.openURL(`tel:${user.phone}`)}>
                                {user.phone || 'No Phone'}
                            </Text>
                            {user.phone && (
                                <IconButton
                                    icon="whatsapp"
                                    size={20}
                                    iconColor="#25D366"
                                    onPress={() => Linking.openURL(`whatsapp://send?phone=${user.phone}`)}
                                />
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                            <Text variant="bodyMedium" style={{ flex: 1, color: '#333' }} onPress={() => user.email && Linking.openURL(`mailto:${user.email}`)}>
                                {user.email || 'No Email'}
                            </Text>
                        </View>
                    </View>

                    <Divider style={{ marginBottom: 15 }} />

                    {/* Actions Row: Attendance & Status */}
                    <View style={{ gap: 10 }}>
                        {/* Attendance Action */}
                        <View style={{ marginTop: 12, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View>
                                    <Text variant="labelSmall" style={{ color: 'gray', textTransform: 'uppercase', letterSpacing: 0.5 }}>Attendance Status</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: todaysAttendance?.out_time ? 'green' : (todaysAttendance ? 'orange' : 'gray'), marginRight: 6 }} />
                                        <Text variant="titleSmall" style={{ fontWeight: 'bold', color: '#333' }}>
                                            {todaysAttendance ? (todaysAttendance.out_time ? 'Checked Out' : 'Checked In') : 'Not Present'}
                                        </Text>
                                    </View>
                                </View>
                                <Button
                                    mode={todaysAttendance && !todaysAttendance.out_time ? "outlined" : "contained"}
                                    textColor={todaysAttendance && !todaysAttendance.out_time ? "#d32f2f" : "white"}
                                    buttonColor={todaysAttendance && !todaysAttendance.out_time ? "white" : theme.colors.primary}
                                    style={{ borderColor: todaysAttendance && !todaysAttendance.out_time ? '#d32f2f' : theme.colors.primary }}
                                    contentStyle={{ paddingHorizontal: 20, height: 36 }}
                                    labelStyle={{ fontSize: 13, fontWeight: 'bold' }}
                                    onPress={async () => {
                                        const canPunchOthers = AuthService.hasPermission(currentUser, 'attendance', 'add');
                                        const isSelf = currentUser?.id === user.id;

                                        if (!isSelf && !canPunchOthers) {
                                            Alert.alert("Permission Denied", "You don't have permission to punch for other users.");
                                            return;
                                        }

                                        try {
                                            if (todaysAttendance && !todaysAttendance.out_time) {
                                                await apiService.checkOut(user.id);
                                            } else {
                                                await apiService.checkIn(user.id);
                                            }
                                            refreshUser();
                                        } catch (error: any) {
                                            Alert.alert("Error", error.message || "Action failed");
                                        }
                                    }}
                                >
                                    {todaysAttendance && !todaysAttendance.out_time ? 'Check Out' : 'Check In'}
                                </Button>
                            </View>
                        </View>

                        {/* Status Toggle Row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                            <Text variant="labelMedium" style={{ color: 'gray' }}>Account Status</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {user.role === 'SUPER_ADMIN' ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                        <MaterialCommunityIcons name="check-circle" size={14} color="green" />
                                        <Text style={{ marginLeft: 4, color: 'green', fontSize: 12, fontWeight: 'bold' }}>Active</Text>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' }}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (!AuthService.hasPermission(currentUser, 'user', 'edit')) return Alert.alert("Denied", "No permission to edit users.");
                                                apiService.updateUser(user.id, { is_active: true } as any).then(() => refreshUser())
                                            }}
                                            style={{ backgroundColor: user.is_active ? 'green' : 'white', paddingHorizontal: 12, paddingVertical: 6 }}
                                        >
                                            <Text style={{ color: user.is_active ? 'white' : 'gray', fontSize: 11, fontWeight: 'bold' }}>Active</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (!AuthService.hasPermission(currentUser, 'user', 'edit')) return Alert.alert("Denied", "No permission to edit users.");
                                                apiService.updateUser(user.id, { is_active: false } as any).then(() => refreshUser())
                                            }}
                                            style={{ backgroundColor: !user.is_active ? 'red' : 'white', paddingHorizontal: 12, paddingVertical: 6 }}
                                        >
                                            <Text style={{ color: !user.is_active ? 'white' : 'gray', fontSize: 11, fontWeight: 'bold' }}>Inactive</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Subscription Warning */}
                {user.subscription_status === 'EXPIRED' && (
                    <View style={{ backgroundColor: '#ffebee', padding: 10, marginHorizontal: 16, marginBottom: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderColor: 'red', borderWidth: 1 }}>
                        <MaterialCommunityIcons name="alert-circle" size={24} color="red" />
                        <Text style={{ marginLeft: 10, color: 'red', fontWeight: 'bold', flex: 1 }}>Subscription Expired! Payment Due.</Text>
                    </View>
                )}

                {/* Subscription & Financial Breakdown Block */}
                <Card style={{ marginHorizontal: 16, marginBottom: 15, backgroundColor: 'white', elevation: 2 }}>
                    <Card.Content style={{ paddingVertical: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <MaterialCommunityIcons name="wallet-membership" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
                            <Text variant="titleSmall" style={{ fontWeight: 'bold', flex: 1 }}>Subscription & Financials</Text>
                        </View>
                        {/* Plan Details */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                            <View>
                                <Text variant="labelSmall" style={{ color: 'gray' }}>Current Plan</Text>
                                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                                    {user.plan_name || 'Standard Plan'}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text variant="labelSmall" style={{ color: 'gray' }}>Rate</Text>
                                <Text variant="bodyMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                                    {user.subscriptions && user.subscriptions.length > 0
                                        ? `₹${user.subscriptions[0].plan?.amount || 0}/${user.subscriptions[0].plan?.frequency === 'DAILY' ? 'day' : 'month'}`
                                        : 'No Active Plan'}
                                </Text>
                            </View>
                        </View>

                        {/* Financial Stats Grid */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0' }}>
                                <Text variant="labelSmall" style={{ color: 'gray' }}>Total Paid</Text>
                                <Text variant="titleMedium" style={{ color: 'green', fontWeight: 'bold' }}>
                                    ₹{user.total_credits || 0}
                                </Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#f0f0f0' }}>
                                <Text variant="labelSmall" style={{ color: 'gray' }}>Total Expenses</Text>
                                <Text variant="titleMedium" style={{ color: '#d32f2f', fontWeight: 'bold' }}>
                                    ₹{user.total_debits || 0}
                                </Text>
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text variant="labelSmall" style={{ color: 'gray' }}>{user.balance > 0 ? 'Due' : 'Advance'}</Text>
                                <Text variant="titleMedium" style={{ color: user.balance > 0 ? 'red' : 'green', fontWeight: 'bold' }}>
                                    ₹{Math.abs(user.balance || 0)}
                                </Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Sticky Top Nav */}
            <View style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                zIndex: 100,
                backgroundColor: theme.colors.primary,
                paddingTop: insets.top,
                height: 60 + insets.top, // Fixed height for stable sticky header
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 8,
                elevation: 4
            }}>
                <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
                <IconButton icon="arrow-left" iconColor="white" size={24} onPress={() => router.back()} />

                {/* Sticky User Info */}
                <View style={{ flex: 1, marginLeft: 0 }}>
                    <Text variant="titleMedium" style={{ color: 'white', fontWeight: 'bold' }} numberOfLines={1}>
                        {user.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: 'rgba(255,255,255,0.8)' }} numberOfLines={1}>
                        {user.phone || user.email || 'No Contact'}
                    </Text>
                </View>

                {(AuthService.hasPermission(currentUser, 'payment', 'add') || AuthService.hasPermission(currentUser, 'charge', 'add')) && (
                    <Menu
                        visible={menuVisible}
                        onDismiss={closeMenu}
                        anchor={<IconButton icon="dots-vertical" iconColor="white" onPress={openMenu} />}
                    >
                        {AuthService.hasPermission(currentUser, 'payment', 'add') && (
                            <Menu.Item onPress={() => { closeMenu(); router.push({ pathname: '/management/add-payment', params: { userId: user.id, initialTxType: 'CREDIT' } }) }} title="Add Payment" leadingIcon="cash-plus" />
                        )}
                        {AuthService.hasPermission(currentUser, 'charge', 'add') && (
                            <Menu.Item onPress={() => { closeMenu(); router.push({ pathname: '/management/add-payment', params: { userId: user.id, initialTxType: 'DEBIT' } }) }} title="Add Charge" leadingIcon="cash-minus" />
                        )}
                    </Menu>
                )}
            </View>

            <Tabs.Container
                renderHeader={renderHeader}
                headerContainerStyle={{ backgroundColor: theme.colors.background, paddingTop: 60 + insets.top }}
                minHeaderHeight={60 + insets.top}
                revealHeaderOnScroll={true}
                pagerProps={{ scrollEnabled: true }}
                renderTabBar={(props) => (
                    <MaterialTabBar
                        {...props}
                        scrollEnabled={true}
                        indicatorStyle={{ backgroundColor: theme.colors.primary, height: 3 }}
                        style={{ backgroundColor: 'white', elevation: 2 }}
                        labelStyle={{
                            fontSize: 13,
                            fontWeight: 'bold',
                            textTransform: 'capitalize'
                        }}
                        tabStyle={{ paddingHorizontal: 16, width: 'auto' }}
                        activeColor={theme.colors.primary}
                        inactiveColor="gray"
                    />
                )}
            >
                <Tabs.Tab name="ledger" label="Ledger">
                    <LedgerRoute userId={Number(id)} isFocused={isFocused} currentUser={currentUser} onUpdate={refreshUser} />
                </Tabs.Tab>
                <Tabs.Tab name="fine" label="Fines">
                    <FineRoute userId={Number(id)} isFocused={isFocused} currentUser={currentUser} onUpdate={refreshUser} />
                </Tabs.Tab>
                <Tabs.Tab name="attendance" label="Attendance">
                    <AttendanceRoute userId={Number(id)} isFocused={isFocused} onUpdate={() => {
                        apiService.getUserById(Number(id)).then(setUser);
                    }} currentUser={currentUser} />
                </Tabs.Tab>
                <Tabs.Tab name="matches" label="Matches">
                    <MatchesRoute userId={Number(id)} isFocused={isFocused} />
                </Tabs.Tab>
                <Tabs.Tab name="permissions" label="Perms">
                    <PermissionsRoute
                        userId={Number(id)}
                        permissions={user?.permissions || []}
                        onUpdate={() => apiService.getUserById(Number(id)).then(setUser)}
                        canEdit={currentUser?.role === 'MANAGEMENT' || currentUser?.role === 'SUPER_ADMIN'}
                        userRole={user?.role}
                    />
                </Tabs.Tab>
            </Tabs.Container>
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerGradient: {
        paddingTop: Platform.OS === 'android' ? 40 : 0,
        paddingBottom: 25,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 30 // Reduced space for floating card
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingTop: 10,
        paddingBottom: 20
    },
    floatingCard: {
        marginTop: -50, // Pull up to overlap with gradient
        marginHorizontal: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginBottom: 10
    },
    miniStatCard: {
        width: 100,
        borderRadius: 12,
        elevation: 2,
    },
    // Sub-component styles
    tabContent: { flex: 1, padding: 16 },
    ledgerCard: { marginBottom: 10, backgroundColor: 'white', elevation: 2, borderRadius: 8 },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0, backgroundColor: '#6200ee' }
});

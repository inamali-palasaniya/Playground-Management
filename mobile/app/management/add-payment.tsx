import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, RadioButton, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function AddPaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { linkedChargeId, linkedAmount, linkedType, editId, initialAmount, initialNotes, initialDate, initialType, initialMethod, initialTxType } = params;

    // User Management
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(params.userId ? Number(params.userId) : null);
    const [userMenuVisible, setUserMenuVisible] = useState(false);

    // Edit Mode Init
    const isEditing = !!editId;

    const [amount, setAmount] = useState<string>(
        isEditing ? (initialAmount ? initialAmount.toString() : '') :
            (linkedAmount ? linkedAmount.toString() : '')
    );
    const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT'>(
        isEditing ? (initialTxType as 'CREDIT' | 'DEBIT' || 'CREDIT') : 'CREDIT'
    );
    const [paymentMethod, setPaymentMethod] = useState(
        isEditing ? (initialMethod as string || 'CASH') : 'CASH'
    );
    const [type, setType] = useState<string>(
        isEditing ? (initialType as string || 'PAYMENT') :
            (linkedType ? linkedType.toString() : 'PAYMENT')
    );
    const [notes, setNotes] = useState(
        isEditing ? (initialNotes as string || '') : ''
    );
    const [loading, setLoading] = useState(false);

    // Dates
    const [date, setDate] = useState(
        isEditing && initialDate ? new Date(initialDate as string) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Subscription Billing Period
    const [billingMonth, setBillingMonth] = useState(new Date());
    const [showBillingPicker, setShowBillingPicker] = useState(false);

    const [typeMenuVisible, setTypeMenuVisible] = useState(false);

    const paymentTypes = [
        { label: 'General Payment', value: 'PAYMENT' },
        { label: 'Subscription', value: 'SUBSCRIPTION' },
        { label: 'Donation', value: 'DONATION' },
        { label: 'Deposit', value: 'DEPOSIT' },
        { label: 'Maintenance', value: 'MAINTENANCE' },
    ];

    React.useEffect(() => {
        // Fetch users for the dropdown
        apiService.getUsers().then(setUsers).catch(console.error);
    }, []);

    React.useEffect(() => {
        if (params.userId) {
            setSelectedUserId(Number(params.userId));
        }
    }, [params.userId]);

    const handleSubmit = async () => {
        if (!amount || !selectedUserId) {
            Alert.alert('Error', 'Amount and User are required');
            return;
        }

        const proceedWithPayment = async () => {
            setLoading(true);
            try {
                if (isEditing) {
                    await apiService.updateLedgerEntry(Number(editId), {
                        amount: parseFloat(amount),
                        notes: notes,
                        date: date.toISOString(),
                        type: type,
                        payment_method: transactionType === 'CREDIT' ? paymentMethod : undefined,
                        // transaction_type not updated usually to avoid structural breaks, 
                        // but logic allows updating fields dependent on it?
                    });
                    Alert.alert('Success', 'Transaction updated successfully');
                } else {
                    await apiService.recordPayment(
                         Number(selectedUserId),
                         parseFloat(amount),
                         paymentMethod,
                         notes,
                         type,
                         date.toISOString(),
                         type === 'SUBSCRIPTION' ? format(billingMonth, 'MMMM yyyy') : undefined,
                         linkedChargeId ? parseInt(linkedChargeId as string) : undefined,
                         transactionType
                     );
                    Alert.alert('Success', 'Payment recorded successfully');
                }
                 router.back();
             } catch (error) {
                 console.error(error);
                Alert.alert('Error', isEditing ? 'Failed to update' : 'Failed to record payment');
             } finally {
                 setLoading(false);
            }
        };

        // Duplicate Check only for NEW items
        if (type === 'SUBSCRIPTION' && !isEditing) {
            try {
                setLoading(true);
                const monthYear = format(billingMonth, 'MMMM yyyy');
                const existing = await apiService.checkSubscriptionPayment(Number(selectedUserId), monthYear);
                setLoading(false);

                if (existing && existing.length > 0) {
                    const details = existing.map((p: any, i: number) => `${i + 1}. ${format(new Date(p.date), 'dd/MM')} - ₹${p.amount}`).join('\n');
                    Alert.alert(
                        'Duplicate Warning',
                        `Found ${existing.length} existing subscription payment(s) for ${monthYear}:\n\n${details}\n\nDo you still want to add this payment?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Yes, Add Duplicate', onPress: proceedWithPayment }
                        ]
                    );
                    return;
                }
            } catch (e) {
                console.error('Check failed', e);
                setLoading(false);
            }
        }

        proceedWithPayment();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleBillingChange = (event: any, selectedDate?: Date) => {
        setShowBillingPicker(false);
        if (selectedDate) setBillingMonth(selectedDate);
    };

    const getSelectedUserName = () => {
        if (!selectedUserId) return 'Select User';
        // If passed via params, we might have userName, but best to use list if available
        if (users.length > 0) {
            const u = users.find(u => u.id === selectedUserId);
            return u ? u.name : (params.userName as string || 'Unknown User');
        }
        return params.userName as string || 'Loading...';
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>{isEditing ? 'Edit Transaction' : 'Record Payment'}</Text>

            {/* User Selector */}
            <View style={{ marginBottom: 15 }}>
                <Text variant="titleMedium" style={styles.label}>User</Text>
                <Menu
                    visible={userMenuVisible}
                    onDismiss={() => setUserMenuVisible(false)}
                    anchor={
                        <Button mode="outlined" onPress={() => !isEditing && setUserMenuVisible(true)} disabled={isEditing}>
                            {getSelectedUserName()}
                        </Button>
                    }
                >
                    {users.map(user => (
                        <Menu.Item
                            key={user.id}
                            onPress={() => {
                                setSelectedUserId(user.id);
                                setUserMenuVisible(false);
                            }}
                            title={user.name}
                        />
                    ))}
                </Menu>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Button
                    mode={transactionType === 'CREDIT' ? 'contained' : 'outlined'}
                    onPress={() => setTransactionType('CREDIT')}
                    style={{ flex: 1, marginRight: 5, backgroundColor: transactionType === 'CREDIT' ? '#4caf50' : undefined }}
                >
                    Receive Payment
                </Button>
                <Button
                    mode={transactionType === 'DEBIT' ? 'contained' : 'outlined'}
                    onPress={() => setTransactionType('DEBIT')}
                    style={{ flex: 1, marginLeft: 5, backgroundColor: transactionType === 'DEBIT' ? '#f44336' : undefined }}
                >
                    Add Charge (Unpaid)
                </Button>
            </View>

            <TextInput
                label="Amount *"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Affix text="₹" />}
            />

            {/* Payment Type Dropdown */}
            <View style={{ marginBottom: 15 }}>
                <Text variant="titleMedium" style={styles.label}>{transactionType === 'DEBIT' ? 'Charge Type' : 'Payment Type'}</Text>
                <Menu
                    visible={typeMenuVisible}
                    onDismiss={() => setTypeMenuVisible(false)}
                    anchor={
                        <Button mode="outlined" onPress={() => setTypeMenuVisible(true)}>
                            {paymentTypes.find(t => t.value === type)?.label || type}
                        </Button>
                    }
                >
                    {paymentTypes.map(t => (
                        <Menu.Item key={t.value} onPress={() => { setType(t.value); setTypeMenuVisible(false); }} title={t.label} />
                    ))}
                </Menu>
            </View>

            {/* Subscription Billing Month */}
            {type === 'SUBSCRIPTION' && (
                <View style={{ marginBottom: 15 }}>
                    <Text variant="titleMedium" style={styles.label}>Billing Month</Text>
                    <Button mode="outlined" onPress={() => setShowBillingPicker(true)}>
                        {format(billingMonth, 'MMMM yyyy')}
                    </Button>
                    {showBillingPicker && (
                        <DateTimePicker
                            value={billingMonth}
                            mode="date"
                            display="default"
                            onChange={handleBillingChange}
                        />
                    )}
                </View>
            )}

            <View style={{ marginBottom: 15 }}>
                <Text variant="titleMedium" style={styles.label}>Payment Date</Text>
                <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                    {format(date, 'dd MMM yyyy')}
                </Button>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
                )}
            </View>

            {/* Payment Method - Only for Credits */}
            {transactionType === 'CREDIT' && (
                <>
                    <Text variant="titleMedium" style={styles.label}>Payment Method</Text>
                    <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                        <View style={styles.radioRow}>
                            <RadioButton.Item label="Cash" value="CASH" />
                            <RadioButton.Item label="Online / UPI" value="ONLINE" />
                        </View>
                    </RadioButton.Group>
                </>
            )}

            <TextInput label="Notes" value={notes} onChangeText={setNotes} style={styles.input} multiline />

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                {isEditing ? 'Update ' + (transactionType === 'DEBIT' ? 'Charge' : 'Payment') : (transactionType === 'DEBIT' ? 'Record Charge' : 'Record Payment')}
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { marginBottom: 10, textAlign: 'center' },
    input: { marginBottom: 15, backgroundColor: '#fff' },
    label: { marginBottom: 5, marginTop: 10 },
    radioRow: { flexDirection: 'row' },
    button: { marginTop: 20, paddingVertical: 6 }
});

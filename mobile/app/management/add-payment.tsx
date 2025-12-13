import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, RadioButton, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function AddPaymentScreen() {
    const router = useRouter();
    const { userId, userName, linkedChargeId, linkedAmount, linkedType } = useLocalSearchParams();
    const [amount, setAmount] = useState<string>(linkedAmount ? linkedAmount.toString() : '');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [type, setType] = useState<string>(linkedType ? linkedType.toString() : 'PAYMENT');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date());
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

    const handleSubmit = async () => {
        if (!amount || !userId) {
            Alert.alert('Error', 'Amount and User are required');
            return;
        }

        const proceedWithPayment = async () => {
            setLoading(true);
            try {
                 await apiService.recordPayment(
                     Number(userId),
                     parseFloat(amount),
                     paymentMethod,
                     notes,
                     type,
                     date.toISOString(),
                     type === 'SUBSCRIPTION' ? format(billingMonth, 'MMMM yyyy') : undefined,
                     linkedChargeId ? parseInt(linkedChargeId as string) : undefined
                 );
                 Alert.alert('Success', 'Payment recorded successfully');
                 router.back();
             } catch (error) {
                 console.error(error);
                 Alert.alert('Error', 'Failed to record payment');
             } finally {
                 setLoading(false);
            }
        };

        if (type === 'SUBSCRIPTION') {
            try {
                setLoading(true);
                const monthYear = format(billingMonth, 'MMMM yyyy');
                const existing = await apiService.checkSubscriptionPayment(Number(userId), monthYear);
                setLoading(false);

                if (existing && existing.length > 0) {
                    const details = existing.map((p, i) => `${i + 1}. ${format(new Date(p.date), 'dd/MM')} - ₹${p.amount}`).join('\n');
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
                // Fail safe: assume no duplicates or just warn error?
                // Better to allow proceed if check fails but log it.
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

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Record Payment</Text>
            {userName && <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 20 }}>For: {userName}</Text>}

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
                <Text variant="titleMedium" style={styles.label}>Payment Type</Text>
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

            <Text variant="titleMedium" style={styles.label}>Payment Method</Text>
            <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                <View style={styles.radioRow}>
                    <RadioButton.Item label="Cash" value="CASH" />
                    <RadioButton.Item label="Online / UPI" value="ONLINE" />
                </View>
            </RadioButton.Group>

            <TextInput label="Notes" value={notes} onChangeText={setNotes} style={styles.input} multiline />

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                Record Payment
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

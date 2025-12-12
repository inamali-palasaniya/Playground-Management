import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, RadioButton } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';

export default function AddPaymentScreen() {
    const router = useRouter();
    const { userId, userName } = useLocalSearchParams(); // Allow passing userId/Name
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!amount || !userId) {
            Alert.alert('Error', 'Amount and User are required');
            return;
        }

        setLoading(true);
        try {
            await apiService.recordPayment(Number(userId), parseFloat(amount), paymentMethod, notes);
            Alert.alert('Success', 'Payment recorded successfully');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Record Payment</Text>
            {userName && <Text variant="titleMedium" style={{ textAlign: 'center', marginBottom: 20 }}>For: {userName}</Text>}

            <TextInput label="Amount *" value={amount} onChangeText={setAmount} keyboardType="numeric" style={styles.input} left={<TextInput.Affix text="₹" />} />

            <Text variant="titleMedium" style={{ marginTop: 10 }}>Payment Method</Text>
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
    radioRow: { flexDirection: 'row' },
    button: { marginTop: 20, paddingVertical: 6 }
});

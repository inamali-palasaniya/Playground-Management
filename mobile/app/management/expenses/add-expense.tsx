import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Appbar, useTheme, HelperText } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../../services/api.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function AddExpenseScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { id } = useLocalSearchParams();

    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            // Fetch existing expense
            // Assuming getExpenses can filter or we find from list?
            // Since api service getExpenses returns list, we fetch all and find suitable one or use separate endpoint if available?
            // My expense controller has getExpenses (all) or perhaps I should add getById?
            // Let's assume for now we use list filtering as I didn't add getById explicitly to controller/routes in previous step
            // Wait, standard CREATE usually implies GET /:id exists?
            // I implemented: getExpenses (List), createExpense, updateExpense, deleteExpense.
            // I did NOT implement getExpenseById in controller.
            // I should add it or just iterate list. Iterate list is inefficient but works for MVP.
            // Actually, I can rely on passing params if I came from list? But usually we fetch fresh.
            // I'll fetch list and find. (Or just trust params if passed).
            // Params passing is safer for now to avoid complexity.

            // Actually users usually pass data via params if small.
            // But navigation params are stringified.
            // Let's trying fetching list.
            setLoading(true);
            apiService.getExpenses().then(list => {
                const exp = list.find(e => e.id === Number(id));
                if (exp) {
                    setName(exp.name);
                    setAmount(exp.amount.toString());
                    setCategory(exp.category);
                    setNotes(exp.notes || '');
                    setDate(new Date(exp.date));
                }
            }).finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async () => {
        if (!amount || !category) {
            Alert.alert('Error', 'Amount and Category are required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                name,
                category,
                amount: parseFloat(amount),
                date: date.toISOString(),
                notes
            };

            if (id) {
                await apiService.request(`/api/expenses/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                // Alert.alert('Success', 'Expense updated');
            } else {
                await apiService.createExpense(payload);
                // Alert.alert('Success', 'Expense created');
            }
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title={id ? "Edit Expense" : "Add Expense"} titleStyle={{ color: 'white' }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.content}>
                <TextInput
                    label="Title / Description *"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                />

                <TextInput
                    label="Category *"
                    value={category}
                    onChangeText={setCategory}
                    style={styles.input}
                    placeholder="e.g. Equipment, Maintenance, Salary"
                />
                <HelperText type="info" visible>
                    Common: Equipment, Maintenance, Rent, Salary, Refreshments
                </HelperText>

                <Button
                    mode="outlined"
                    onPress={() => setShowDatePicker(true)}
                    style={styles.input}
                    icon="calendar"
                >
                    {format(date, 'dd MMM yyyy')}
                </Button>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) setDate(selectedDate);
                        }}
                    />
                )}

                <TextInput
                    label="Notes"
                    value={notes}
                    onChangeText={setNotes}
                    style={styles.input}
                    multiline
                />

                <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                    {id ? "Update Expense" : "Save Expense"}
                </Button>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    content: { padding: 20 },
    input: { marginBottom: 12, backgroundColor: '#fff' },
    button: { marginTop: 20, paddingVertical: 6 }
});

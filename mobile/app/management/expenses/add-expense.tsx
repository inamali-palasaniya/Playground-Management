import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Appbar, useTheme, HelperText, Menu, TouchableRipple } from 'react-native-paper';
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

    // Dropdown state
    const [visible, setVisible] = useState(false); // Menu visibility
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        apiService.request('/api/masters/expense-categories')
            .then(data => setCategories(data as any[]))
            .catch(err => console.error('Failed to load categories', err));

        if (id) {
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
        if (!amount || !category || !name) {
            Alert.alert('Error', 'Name, Amount and Category are required');
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
            } else {
                await apiService.createExpense(payload);
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
                    label="Amount *"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Affix text="₹ " />}
                />

                <Menu
                    visible={visible}
                    onDismiss={() => setVisible(false)}
                    anchor={
                        <TouchableRipple onPress={() => setVisible(true)}>
                            <TextInput
                                label="Category *"
                                value={category}
                                editable={false} // Make it readonly, click opens menu
                                right={<TextInput.Icon icon="menu-down" onPress={() => setVisible(true)} />}
                                style={styles.input}
                            />
                        </TouchableRipple>
                    }
                >
                    {categories.map((cat) => (
                        <Menu.Item
                            key={cat.id}
                            onPress={() => {
                                setCategory(cat.name);
                                setVisible(false);
                            }}
                            title={cat.name}
                        />
                    ))}
                    <Menu.Item onPress={() => router.push('/management/masters/categories')} title="+ Manage Categories" />
                </Menu>

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

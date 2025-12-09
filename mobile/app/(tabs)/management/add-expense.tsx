import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import apiService from '../../../services/api.service';

const CATEGORIES = ['Equipment', 'Maintenance', 'Bills', 'Refreshments', 'Other'];

export default function AddExpense() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Equipment');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !amount) {
            Alert.alert('Error', 'Please enter name and amount');
            return;
        }

        setLoading(true);
        try {
            await apiService.createExpense({
                name: name.trim(),
                amount: parseFloat(amount),
                category,
                notes: notes.trim() || undefined,
            });

            Alert.alert('Success', 'Expense recorded successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            console.error('Failed to create expense:', error);
            Alert.alert('Error', 'Failed to create expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
             <View style={styles.form}>
                <Text variant="headlineSmall" style={styles.title}>Add Expense</Text>

                <TextInput
                    label="Description"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    disabled={loading}
                />

                <TextInput
                    label="Amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Affix text="₹" />}
                    disabled={loading}
                />

                <Text variant="titleMedium" style={styles.label}>Category</Text>
                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <Button
                            mode="outlined"
                            onPress={() => setMenuVisible(true)}
                            style={styles.menuButton}
                            contentStyle={styles.menuButtonContent}
                        >
                            {category}
                        </Button>
                    }
                >
                    {CATEGORIES.map(cat => (
                        <Menu.Item
                            key={cat}
                            onPress={() => {
                                setCategory(cat);
                                setMenuVisible(false);
                            }}
                            title={cat}
                        />
                    ))}
                </Menu>

                <TextInput
                    label="Notes (Optional)"
                    value={notes}
                    onChangeText={setNotes}
                    style={styles.input}
                    multiline
                    disabled={loading}
                />

                <Button
                    mode="contained"
                    onPress={handleSave}
                    style={styles.button}
                    loading={loading}
                    disabled={loading}
                >
                    Save Expense
                </Button>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    form: {
        padding: 20,
    },
    title: {
        marginBottom: 20,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    label: {
        marginTop: 8,
        marginBottom: 8,
    },
    menuButton: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    menuButtonContent: {
        justifyContent: 'flex-start',
    },
    button: {
        marginTop: 16,
    },
});

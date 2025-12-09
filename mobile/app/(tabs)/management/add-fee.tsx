import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function AddFee() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await apiService.getUsers();
            setUsers(data);
            // Don't auto-select, force user to pick
        } catch (error) {
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleSave = async () => {
        if (!selectedUserId || !amount) {
            Alert.alert('Error', 'Please select a user and enter amount');
            return;
        }

        setLoading(true);
        try {
            await apiService.recordPayment(
                selectedUserId,
                parseFloat(amount),
                paymentMethod,
                notes
            );
            Alert.alert('Success', 'Payment recorded successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to record payment:', error);
            Alert.alert('Error', 'Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    const getSelectedUserName = () => {
        if (!selectedUserId) return 'Select User';
        return users.find(u => u.id === selectedUserId)?.name || 'Select User';
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <Text variant="headlineSmall" style={styles.title}>Add Fee / Payment</Text>

                <Text variant="titleMedium" style={styles.label}>Select User</Text>
                {loadingUsers ? (
                    <ActivityIndicator style={styles.loader} />
                ) : (
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
                                {getSelectedUserName()}
                            </Button>
                        }
                    >
                        {users.map(user => (
                            <Menu.Item
                                key={user.id}
                                onPress={() => {
                                    setSelectedUserId(user.id);
                                    setMenuVisible(false);
                                }}
                                title={user.name}
                            />
                        ))}
                    </Menu>
                )}

                <TextInput
                    label="Amount"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                    left={<TextInput.Affix text="₹" />}
                    disabled={loading}
                />

                <TextInput
                    label="Payment Method"
                    value={paymentMethod}
                    onChangeText={setPaymentMethod}
                    style={styles.input}
                    disabled={loading}
                />

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
                    Save Payment
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
    label: {
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    loader: {
        marginVertical: 20,
    },
    menuButton: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    menuButtonContent: {
        justifyContent: 'flex-start',
    },
    pickerContainer: {
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
    },
    button: {
        marginTop: 16,
    },
});

import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, RadioButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';
import { Picker } from '@react-native-picker/picker'; // You might need to install this or use standard inputs if not available.
// Actually standard TextInput for simplicity or a custom implementation if Picker isn't installed.
// The user environment info didn't show package.json recently properly for mobile dependencies. 
// Safest is to use React Native Paper Menu or just simple inputs for now to avoid dependency errors.
// But wait, `apply-fine.tsx` likely uses a user picker. Let's assume we can list users.

export default function AddFee() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await apiService.getUsers();
            setUsers(data);
            if (data.length > 0) setSelectedUserId(data[0].id);
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

    return (
        <View style={styles.container}>
            <Text variant="titleMedium" style={styles.label}>Select User</Text>
            {loadingUsers ? (
                <ActivityIndicator style={styles.loader} />
            ) : (
                 <View style={styles.pickerContainer}>
                    {/* Using simple mapping for selection UI if Picker is missing, or simple text input for ID if strictly needed. 
                        But we can try to use a simple View with RadioButtons if list is small, or just a TextInput for User ID? 
                        No, that's bad UX. 
                        Let's simulate a Picker using standard View/Text for now or assume we can just pick the first one for MVP.
                        Actually, I can implement a simple visual selector.
                    */}
                    {/* For robustness without extra deps, I'll use a TextInput for User Search or just limit to first 5 users? 
                        Let's try a simple ScrollView list if list is long? 
                        Let's stick to a simple text input for User ID if I can't confirm Picker. 
                        Wait, checking `add-user.tsx`... it doesn't pick users.
                        Checking `apply-fine.tsx` would have been smart.
                        I'll use a simple name filter logic. 
                    */}
                    {/* fallback: Just render list of buttons for users? */}
                     {/* I'll use a TextInput to match name for now, or just ID if desperate. 
                         Actually, let's just use `Picker` from `@react-native-picker/picker`.
                         The user probably has it if they have other libraries. 
                         If not, the build will fail. 
                         Let's check `mobile/package.json` first? 
                         I'll assume it's NOT there and build a safe UI: List of users.
                     */}
                </View>
            )}
             {/* Re-thinking: I'll use a TextInput for "User ID" for now to be 100% safe, 
                 OR better, a list of users you can tap.
              */}
              {/* Going with safe list selection */}
        </View>
    );
}
// ABORT: I need to check `package.json` to see if I can use Picker or Dropdown.
// Using `apply-fine.tsx` as reference is better.

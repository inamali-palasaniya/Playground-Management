import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, RadioButton, Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import apiService from '../../../services/api.service';

export default function AddUser() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('NORMAL');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !phone.trim()) {
            Alert.alert('Error', 'Please enter name and phone number');
            return;
        }

        setLoading(true);
        try {
            await apiService.createUser({
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim() || undefined,
                role: role as 'NORMAL' | 'MANAGEMENT',
            });

            Alert.alert('Success', 'User created successfully!', [
                {
                    text: 'OK',
                    onPress: () => router.back(),
                },
            ]);
        } catch (error) {
            console.error('Failed to create user:', error);
            Alert.alert('Error', 'Failed to create user. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                disabled={loading}
            />
            <TextInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                disabled={loading}
            />
            <TextInput
                label="Email (Optional)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
                disabled={loading}
            />

            <Text variant="titleMedium" style={styles.label}>Role</Text>
            <RadioButton.Group onValueChange={newValue => setRole(newValue)} value={role}>
                <View style={styles.radioRow}>
                    <RadioButton value="NORMAL" disabled={loading} />
                    <Text>Normal</Text>
                </View>
                <View style={styles.radioRow}>
                    <RadioButton value="MANAGEMENT" disabled={loading} />
                    <Text>Management</Text>
                </View>
            </RadioButton.Group>

            <Button
                mode="contained"
                onPress={handleSave}
                style={styles.button}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="white" /> : 'Save User'}
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    label: {
        marginBottom: 8,
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    button: {
        marginTop: 16,
    },
});

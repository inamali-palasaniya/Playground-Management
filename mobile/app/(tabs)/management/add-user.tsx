import { View, StyleSheet } from 'react-native';
import { TextInput, Button, RadioButton, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function AddUser() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('NORMAL');

    const handleSave = () => {
        // Call API to save user
        console.log({ name, phone, role });
        router.back();
    };

    return (
        <View style={styles.container}>
            <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
            />
            <TextInput
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
            />

            <Text variant="titleMedium" style={styles.label}>Role</Text>
            <RadioButton.Group onValueChange={newValue => setRole(newValue)} value={role}>
                <View style={styles.radioRow}>
                    <RadioButton value="NORMAL" />
                    <Text>Normal</Text>
                </View>
                <View style={styles.radioRow}>
                    <RadioButton value="MANAGEMENT" />
                    <Text>Management</Text>
                </View>
            </RadioButton.Group>

            <Button mode="contained" onPress={handleSave} style={styles.button}>
                Save User
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

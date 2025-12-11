import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, RadioButton, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../services/api.service';

export default function AddUserScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('NORMAL');
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

    useEffect(() => {
        apiService.request('/groups').then((data: any) => setGroups(data)).catch(console.error);
    }, []);

    const handleSubmit = async () => {
        if (!name || !phone || !password) {
            Alert.alert('Error', 'Name, Phone and Password are required');
            return;
        }
        setLoading(true);
        try {
            await apiService.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    password,
                    role,
                    group_id: selectedGroup
                }),
            });
            Alert.alert('Success', 'User created successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Add New User</Text>
            
            <TextInput label="Name *" value={name} onChangeText={setName} style={styles.input} />
            <TextInput label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
            <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
            <TextInput label="Password *" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

            <Text variant="titleMedium" style={{marginTop:10}}>Role</Text>
            <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
                <View style={styles.radioRow}>
                    <RadioButton.Item label="Player" value="NORMAL" />
                    <RadioButton.Item label="Management" value="MANAGEMENT" />
                </View>
            </RadioButton.Group>

            <Text variant="titleMedium" style={{marginTop:10}}>Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groups.map(g => (
                    <Button 
                        key={g.id} 
                        mode={selectedGroup === g.id ? 'contained' : 'outlined'} 
                        onPress={() => setSelectedGroup(g.id)}
                        style={{marginRight: 8}}
                    >
                        {g.name}
                    </Button>
                ))}
            </ScrollView>

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                Create User
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { marginBottom: 20, textAlign: 'center' },
    input: { marginBottom: 12, backgroundColor: '#fff' },
    radioRow: { flexDirection: 'row' },
    button: { marginTop: 20, paddingVertical: 6 },
    groupScroll: { flexDirection: 'row', marginVertical: 10 }
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, RadioButton, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';

export default function EditUserScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [age, setAge] = useState('');
    const [userType, setUserType] = useState('NORMAL');
    const [role, setRole] = useState('NORMAL');
    
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Groups
                const groupsData = await apiService.getGroups();
                setGroups(groupsData || []);

                // Fetch User Details
                if (id) {
                    const user = await apiService.getUserById(Number(id));
                    setName(user.name);
                    setPhone(user.phone);
                    setEmail(user.email || '');
                    // setDetail(user.detail || ''); // If detail exists
                    setRole(user.role);
                    
                    // Assuming user object has these fields, need to verify API response structure
                    // The API returns: { ..., age: number, user_type: string, group_id: number }
                    if ((user as any).age) setAge((user as any).age.toString());
                    if ((user as any).user_type) setUserType((user as any).user_type);
                    if ((user as any).group_id) setSelectedGroup((user as any).group_id);
                }
            } catch (error) {
                console.error('Failed to load data:', error);
                Alert.alert('Error', 'Failed to load user details.');
                router.back();
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmit = async () => {
        if (!name || !phone) {
            Alert.alert('Error', 'Name and Phone are required');
            return;
        }
        setLoading(true);
        try {
            await apiService.updateUser(Number(id), {
                name,
                phone,
                email,
                role,
                group_id: selectedGroup || undefined, // Send undefined if null to skip or handle backend null
                age: age ? age : undefined, // Check backend handling
                user_type: userType
            });
            Alert.alert('Success', 'User updated successfully');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Edit User</Text>

            <TextInput label="Name *" value={name} onChangeText={setName} style={styles.input} />
            <TextInput label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
            <TextInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" style={styles.input} />
            
            <TextInput label="Age" value={age} onChangeText={setAge} keyboardType="numeric" style={styles.input} />

            <Text variant="titleMedium" style={{ marginTop: 10 }}>User Type</Text>
            <View style={styles.radioRow}>
                <Button mode={userType === 'STUDENT' ? 'contained' : 'outlined'} onPress={() => setUserType('STUDENT')} style={styles.typeButton} compact>Student</Button>
                <Button mode={userType === 'SALARIED' ? 'contained' : 'outlined'} onPress={() => setUserType('SALARIED')} style={styles.typeButton} compact>Salaried</Button>
                <Button mode={userType === 'NON_EARNED' ? 'contained' : 'outlined'} onPress={() => setUserType('NON_EARNED')} style={styles.typeButton} compact>Non-Earned</Button>
            </View>

            <Text variant="titleMedium" style={{ marginTop: 10 }}>Role</Text>
            <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
                <View style={styles.radioRow}>
                    <RadioButton.Item label="Player" value="NORMAL" />
                    <RadioButton.Item label="Management" value="MANAGEMENT" />
                </View>
            </RadioButton.Group>

            <Text variant="titleMedium" style={{ marginTop: 10 }}>Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {groups.map(g => (
                    <Button
                        key={g.id}
                        mode={selectedGroup === g.id ? 'contained' : 'outlined'}
                        onPress={() => setSelectedGroup(g.id)}
                        style={{ marginRight: 8 }}
                    >
                        {g.name}
                    </Button>
                ))}
            </ScrollView>

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                Update User
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 20, textAlign: 'center' },
    input: { marginBottom: 12, backgroundColor: '#fff' },
    radioRow: { flexDirection: 'row', flexWrap: 'wrap' },
    button: { marginTop: 20, paddingVertical: 6 },
    groupScroll: { flexDirection: 'row', marginVertical: 10 },
    typeButton: { marginRight: 8, marginBottom: 8 }
});

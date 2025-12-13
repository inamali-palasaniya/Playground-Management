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
    const [age, setAge] = useState('');
    const [userType, setUserType] = useState('NORMAL');
    const [role, setRole] = useState('NORMAL');
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [paymentFrequency, setPaymentFrequency] = useState('MONTHLY');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Groups
                try {
                    const groupsData = await apiService.getGroups();
                    setGroups(groupsData || []);
                } catch (e) {
                    console.error('Failed to fetch groups:', e);
                }

                // Fetch Plans
                try {
                    const plansData = await apiService.getSubscriptionPlans();
                    setPlans(plansData || []);
                } catch (e) {
                    console.error('Failed to fetch plans:', e);
                    Alert.alert('Error', 'Failed to load subscription plans. Please check connection.');
                }
            } catch (err) {
                console.error('Global fetch error:', err);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async () => {
        if (!name || !phone || !password) {
            Alert.alert('Error', 'Name, Phone and Password are required');
            return;
        }
        setLoading(true);
        try {
            await apiService.request('/api/users', { 
                method: 'POST',
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    password,
                    role,
                    group_id: selectedGroup,
                    age,
                    user_type: userType,
                    plan_id: selectedPlan,
                    payment_frequency: selectedPlan ? paymentFrequency : undefined
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

            <Text variant="titleMedium" style={{ marginTop: 10 }}>Plan Selection</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupScroll}>
                {plans.map(p => (
                    <Button
                        key={p.id}
                        mode={selectedPlan === p.id ? 'contained' : 'outlined'}
                        onPress={() => setSelectedPlan(p.id)}
                        style={{ marginRight: 8 }}
                    >
                        {p.name}
                    </Button>
                ))}
            </ScrollView>

            {selectedPlan && (
                <View style={{ marginTop: 10, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8 }}>
                    <Text variant="titleMedium">Payment Frequency</Text>
                    <RadioButton.Group onValueChange={value => setPaymentFrequency(value)} value={paymentFrequency}>
                        <View style={styles.radioRow}>
                            <RadioButton.Item label="Monthly" value="MONTHLY" />
                            <RadioButton.Item label="Daily" value="DAILY" />
                        </View>
                    </RadioButton.Group>
                    <Text variant="bodySmall" style={{ color: 'gray' }}>
                        {paymentFrequency === 'MONTHLY' ? 'User pays monthly fixed fee.' : 'User pays per attendance (Punch In).'}
                    </Text>
                </View>
            )}

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
    radioRow: { flexDirection: 'row', flexWrap: 'wrap' },
    button: { marginTop: 20, paddingVertical: 6 },
    groupScroll: { flexDirection: 'row', marginVertical: 10 },
    typeButton: { marginRight: 8, marginBottom: 8 }
});

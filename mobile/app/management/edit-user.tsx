import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, RadioButton, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';
import { PermissionSelector } from '../../components/PermissionSelector';

import { MaterialCommunityIcons } from '@expo/vector-icons';

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
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
    const [paymentFrequency, setPaymentFrequency] = useState('MONTHLY');
    const [permissions, setPermissions] = useState<any[]>([]);
    const [isActive, setIsActive] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null); // To check if Super Admin is editing?
    // Actually we rely on backend to block. But for UI, we might default 'SUPER_ADMIN' to disabled fields.

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Groups
                const groupsData = await apiService.getGroups();
                setGroups(groupsData || []);

                // Fetch Plans
                const plansData = await apiService.getSubscriptionPlans();
                setPlans(plansData || []);

                // Fetch User Details
                if (id) {
                    const user = await apiService.getUserById(Number(id));
                    setName(user.name);
                    setPhone(user.phone);
                    setEmail(user.email || '');
                    setRole(user.role);

                    if ((user as any).age) setAge((user as any).age.toString());
                    if ((user as any).user_type) setUserType((user as any).user_type);
                    if ((user as any).group_id) setSelectedGroup((user as any).group_id);
                    if ((user as any).permissions) setPermissions((user as any).permissions);
                    if ((user as any).is_active !== undefined) setIsActive((user as any).is_active);

                    // Super Admin check?
                    if (user.email === '91inamali@gmail.com') {
                        // Maybe disable editing some fields?
                    }

                    // Check active subscription for Plan and Frequency
                    if (user.subscriptions && user.subscriptions.length > 0) {
                        const activeSub = user.subscriptions.find((s: any) => s.status === 'ACTIVE');
                        if (activeSub) {
                            setSelectedPlan(activeSub.plan_id);
                            if (activeSub.payment_frequency) {
                                setPaymentFrequency(activeSub.payment_frequency);
                            }
                        }
                    }
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
                group_id: selectedGroup || undefined,
                age: age ? parseInt(age, 10) : undefined,
                user_type: userType,
                plan_id: selectedPlan || undefined,
                payment_frequency: selectedPlan ? paymentFrequency : undefined,
                permissions: role === 'MANAGEMENT' ? permissions : [],
                is_active: isActive
            });
            // Alert.alert('Success', 'User updated successfully');
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
            {role === 'SUPER_ADMIN' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff3cd', borderRadius: 8 }}>
                    <MaterialCommunityIcons name="shield-crown" size={20} color="gold" />
                    <Text style={{ marginLeft: 8, fontWeight: 'bold', color: '#856404' }}>Super Admin (Immutable)</Text>
                </View>
            ) : (
                <RadioButton.Group onValueChange={value => setRole(value)} value={role}>
                    <View style={styles.radioRow}>
                        <RadioButton.Item label="Player" value="NORMAL" />
                        <RadioButton.Item label="Management" value="MANAGEMENT" />
                    </View>
                </RadioButton.Group>
            )}

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

            <Text variant="titleMedium" style={{ marginTop: 10 }}>Plan Selection (Update)</Text>
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

            <View style={{ marginTop: 20 }}>
                <Text variant="titleMedium">Status</Text>
                {role === 'SUPER_ADMIN' ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e8f5e9', padding: 10, borderRadius: 8, alignSelf: 'flex-start' }}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="green" />
                        <Text style={{ marginLeft: 8, color: 'green', fontWeight: 'bold' }}>Active (Protected)</Text>
                    </View>
                ) : (
                    <View style={styles.radioRow}>
                        <Button mode={isActive ? 'contained' : 'outlined'} onPress={() => setIsActive(true)} style={styles.typeButton} compact buttonColor={isActive ? 'green' : undefined}>Active</Button>
                        <Button mode={!isActive ? 'contained' : 'outlined'} onPress={() => setIsActive(false)} style={styles.typeButton} compact buttonColor={!isActive ? 'red' : undefined}>Inactive</Button>
                    </View>
                )}
            </View>

            {role === 'MANAGEMENT' && (
                <View style={{ marginTop: 20 }}>
                    <Text variant="titleMedium" style={{ marginBottom: 10 }}>Permissions</Text>
                    <PermissionSelector
                        permissions={permissions}
                        onChange={setPermissions}
                    />
                </View>
            )}

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

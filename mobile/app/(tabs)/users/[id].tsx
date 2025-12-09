import { View, ScrollView, StyleSheet, useWindowDimensions, Alert } from 'react-native';
import { Text, Avatar, Button, Card, Divider, useTheme, SegmentedButtons, List, ActivityIndicator, Chip } from 'react-native-paper';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import apiService from '../../../services/api.service';

const FineHistory = ({ userId }: { userId: number }) => {
    const [fines, setFines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                try {
                    const data = await apiService.getUserFines(userId);
                    setFines(data);
                } finally { setLoading(false); }
            };
            load();
        }, [userId])
    );

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
            {fines.map((fine, index) => (
                <List.Item
                    key={index}
                    title={`Fine: ${fine.rule.name}`}
                    description={`Amount: ₹${fine.amount_charged} | Date: ${new Date(fine.date).toLocaleDateString()}`}
                    left={props => <List.Icon {...props} icon="alert-circle" color="red" />}
                />
            ))}
            {fines.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No fines found.</Text>}
        </ScrollView>
    );
};

const PaymentHistory = ({ userId }: { userId: number }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                try {
                    const data = await apiService.getUserLedger(userId);
                    setPayments(data);
                } finally { setLoading(false); }
            };
            load();
        }, [userId])
    );

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
            {payments.map((item, index) => (
                <List.Item
                    key={index}
                    title={item.type}
                    description={`Amount: ₹${item.amount} | Date: ${new Date(item.date).toLocaleDateString()}`}
                    right={props => item.is_paid
                        ? <List.Icon {...props} icon="check-circle" color="green" />
                        : <List.Icon {...props} icon="clock-outline" color="orange" />}
                />
            ))}
            {payments.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No records found.</Text>}
        </ScrollView>
    );
};

const AttendanceHistory = ({ userId }: { userId: number }) => {
    const [attendance, setAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                try {
                    const data = await apiService.getUserAttendance(userId);
                    setAttendance(data);
                } finally { setLoading(false); }
            };
            load();
        }, [userId])
    );

    if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: 'white' }}>
            {attendance.map((att, index) => (
                <List.Item
                    key={index}
                    title={new Date(att.date).toLocaleDateString()}
                    description={att.is_present ? "Present" : "Absent"}
                    left={props => <List.Icon {...props} icon={att.is_present ? "account-check" : "account-remove"} color={att.is_present ? "green" : "red"} />}
                />
            ))}
            {attendance.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No attendance records.</Text>}
        </ScrollView>
    );
}

export default function UserDetailScreen() {
    const { id } = useLocalSearchParams();
    const theme = useTheme();
    const layout = useWindowDimensions();
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [index, setIndex] = useState(0);
    const [routes] = useState([
        { key: 'fines', title: 'Fines' },
        { key: 'payments', title: 'Ledger' },
        { key: 'attendance', title: 'Attendance' },
    ]);

    const isSuperAdmin = apiService.getCurrentUser()?.role === 'MANAGEMENT'; // Simplified check

    const loadUser = async () => {
        try {
            const data = await apiService.getUserById(Number(id));
            setUser(data);
        } catch (error) {
            console.error('Failed to load user', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadUser();
        }, [id])
    );

    const renderScene = ({ route }: any) => {
        switch (route.key) {
            case 'fines': return <FineHistory userId={Number(id)} />;
            case 'payments': return <PaymentHistory userId={Number(id)} />;
            case 'attendance': return <AttendanceHistory userId={Number(id)} />;
            default: return null;
        }
    };

    const handleRoleChange = async (newRole: string) => {
        // Mock implementation until API supports update
        // In real app: await apiService.updateUser(user.id, { role: newRole });
        Alert.alert("Coming Soon", "Update role API implementation pending.");
    };

    if (loading || !user) {
        return <ActivityIndicator size="large" style={styles.centered} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text size={64} label={user.name.substring(0, 2).toUpperCase()} style={{ backgroundColor: theme.colors.tertiaryContainer }} />
                <View style={styles.headerInfo}>
                    <Text variant="headlineSmall" style={styles.name}>{user.name}</Text>
                    <Text variant="bodyMedium">{user.phone}</Text>
                    <Text variant="bodyMedium">{user.email}</Text>
                </View>
                <View style={styles.roleContainer}>
                    <Text variant="labelSmall" style={{ marginBottom: 4 }}>Role</Text>
                    {isSuperAdmin ? (
                        <Button mode="outlined" compact onPress={() => Alert.alert("Change Role", `Current: ${user.role}`)}>
                            {user.role}
                        </Button>
                    ) : (
                        <Chip>{user.role}</Chip>
                    )}
                </View>
            </View>

            <Divider />

            <TabView
                navigationState={{ index, routes }}
                renderScene={renderScene}
                onIndexChange={setIndex}
                initialLayout={{ width: layout.width }}
                renderTabBar={props => (
                    <TabBar
                        {...props}
                        indicatorStyle={{ backgroundColor: theme.colors.primary }}
                        style={{ backgroundColor: 'white' }}
                        activeColor="black"
                        inactiveColor="gray"
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', padding: 16, backgroundColor: 'white', alignItems: 'center' },
    headerInfo: { flex: 1, marginLeft: 16 },
    name: { fontWeight: 'bold' },
    roleContainer: { alignItems: 'flex-end' },
});

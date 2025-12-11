import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, Avatar, Divider, useTheme, ActivityIndicator, Card, Chip } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import apiService from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { format } from 'date-fns';

export default function ProfileScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [todayAttendance, setTodayAttendance] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await AuthService.getUser();
            setCurrentUser(user);

            if (user) {
                // Get today's attendance for this user
                const today = format(new Date(), 'yyyy-MM-dd');
                const attendance = await apiService.getAttendanceByDate(today);
                const myAttendance = attendance.find((a: any) => a.user_id === user.id);
                setTodayAttendance(myAttendance);
            }
        } catch (error) {
            console.error('Failed to load profile data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await AuthService.logout();
            router.replace('/login');
        } catch (error) {
            console.error('Logout failed', error);
            Alert.alert('Error', 'Failed to logout');
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (!currentUser) {
        return (
            <View style={styles.centered}>
                <Text>No user data found.</Text>
                <Button mode="contained" onPress={() => router.replace('/login')} style={{ marginTop: 20 }}>
                    Go to Login
                </Button>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Text 
                    size={80} 
                    label={currentUser.name.substring(0, 2).toUpperCase()}
                    style={{ backgroundColor: theme.colors.primary }}
                />
                <Text variant="headlineMedium" style={styles.name}>
                    {currentUser.name}
                </Text>
                <Chip icon="shield-account" style={styles.roleChip}>{currentUser.role}</Chip>
            </View>

            <View style={styles.content}>
                <Card style={styles.card}>
                    <Card.Title title="Contact Information" left={(props) => <Avatar.Icon {...props} icon="card-account-details" />} />
                    <Card.Content>
                        <View style={styles.row}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{currentUser.email || 'N/A'}</Text>
                        </View>
                        <Divider style={styles.divider} />
                        <View style={styles.row}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{currentUser.phone}</Text>
                        </View>
                    </Card.Content>
                </Card>

                <Card style={[styles.card, { marginTop: 16 }]}>
                    <Card.Title title="Today's Status" left={(props) => <Avatar.Icon {...props} icon="calendar-clock" />} />
                    <Card.Content>
                        <View style={styles.statusContainer}>
                            {todayAttendance ? (
                                <>
                                    <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                                        Present
                                    </Text>
                                    <Text variant="bodyLarge" style={{ marginTop: 8 }}>
                                        Check-in: {format(new Date(todayAttendance.check_in_time), 'hh:mm a')}
                                    </Text>
                                    {todayAttendance.check_out_time && (
                                        <Text variant="bodyLarge">
                                            Check-out: {format(new Date(todayAttendance.check_out_time), 'hh:mm a')}
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <Text variant="titleLarge" style={{ color: theme.colors.secondary }}>
                                    Not Checked In Yet
                                </Text>
                            )}
                            <Text variant="labelMedium" style={{ marginTop: 16, color: '#888' }}>
                                {format(new Date(), 'EEEE, d MMMM yyyy')}
                            </Text>
                        </View>
                    </Card.Content>
                </Card>

                <Button 
                    mode="contained"
                    onPress={handleLogout}
                    style={styles.logoutButton}
                    buttonColor={theme.colors.error}
                    icon="logout"
                >
                    Logout
                </Button>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 2 },
    name: { marginTop: 16, fontWeight: 'bold' },
    roleChip: { marginTop: 8 },
    content: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
    label: { color: '#666', fontWeight: '500' },
    value: { fontWeight: 'bold' },
    divider: { backgroundColor: '#eee' },
    statusContainer: { alignItems: 'center', padding: 16 },
    logoutButton: { marginTop: 24, borderRadius: 8, paddingVertical: 6 },
});

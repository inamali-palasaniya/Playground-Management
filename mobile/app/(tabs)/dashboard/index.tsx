
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Searchbar, FAB, Avatar, Card, Chip, ActivityIndicator, useTheme, IconButton, Menu, Button, Divider } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthService } from '../../../services/auth.service';
import HeaderProfile from '../../../components/HeaderProfile';
import { useAuth } from '../../../context/AuthContext';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const { user: authUser } = useAuth(); // Use Context
    const [user, setUser] = useState<any>(authUser); // Init with context user
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [financials, setFinancials] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>(authUser?.role || 'NORMAL');

    const loadData = async () => {
        try {
            setLoading(true);
            const currentUser = authUser || await AuthService.getUser(); // Fallback

            if (!currentUser) {
                setLoading(false);
                return;
            }

            setUserRole(currentUser.role || 'NORMAL');

            // Refresh user details to get latest punch status
            try {
                const freshUser = await apiService.request(`/api/users/${currentUser.id}`, { skipLoader: true });
                setUser(freshUser);
            } catch (ignore) {
                setUser(currentUser); // Fallback to auth user if fetch fails
                console.log("Fresh user fetch failed, using auth user");
            }

            const queryParams = (currentUser?.role === 'NORMAL') ? `?userId=${currentUser.id}` : '';

            const [finData, attData] = await Promise.all([
                apiService.request(`/api/analytics/financial-summary${queryParams}`, { skipLoader: true }),
                apiService.request(`/api/analytics/attendance-stats${queryParams}`, { skipLoader: true })
            ]);
            setFinancials(finData);
            setAttendance(attData);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return `₹${amount?.toLocaleString('en-IN') || 0}`;
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Restored Custom Header */}
            <View style={{ marginBottom: 20 }}>
                <HeaderProfile />
            </View>

            <View style={styles.header}>
                <Text variant="headlineMedium" style={styles.greeting}>
                    {userRole === 'NORMAL' ? 'My Dashboard' : 'Overview'}
                </Text>
                <Text variant="bodyLarge" style={styles.date}>
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" style={styles.loader} />
            ) : (
                <>
                    {/* NORMAL USER: Personal Status Card */}
                    {userRole === 'NORMAL' && user && (
                        <Card style={[styles.card, { backgroundColor: user.punch_status === 'IN' ? '#e8f5e9' : '#ffebee', marginBottom: 16 }]}>
                            <Card.Content>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text variant="titleLarge" style={{ fontWeight: 'bold' }}>
                                            {user.punch_status === 'IN' ? 'You are CHECKED IN' : 'You are CHECKED OUT'}
                                        </Text>
                                        <Text variant="bodyMedium" style={{ color: 'gray' }}>
                                            {user.punch_status === 'IN' ? 'Enjoy your time at the turf!' : 'See you next time!'}
                                        </Text>
                                    </View>
                                    <Avatar.Icon
                                        size={48}
                                        icon={user.punch_status === 'IN' ? 'clock-check' : 'clock-out'}
                                        color="white"
                                        style={{ backgroundColor: user.punch_status === 'IN' ? '#4CAF50' : '#F44336' }}
                                    />
                                </View>

                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                    <Button
                                        mode="contained"
                                        style={{ flex: 1, backgroundColor: user.punch_status === 'IN' ? '#F44336' : '#4CAF50' }}
                                        onPress={async () => {
                                            try {
                                                if (user.punch_status === 'IN') {
                                                    await apiService.checkOut(user.id);
                                                } else {
                                                    await apiService.checkIn(user.id);
                                                }
                                                loadData(); // Refresh to show new status
                                            } catch (error) {
                                                console.error(error);
                                                alert('Punch failed');
                                            }
                                        }}
                                    >
                                        {user.punch_status === 'IN' ? 'Check Out' : 'Check In'}
                                    </Button>
                                    <Button
                                        mode="contained-tonal"
                                        style={{ flex: 1 }}
                                        icon="account-details"
                                        onPress={() => router.push(`/management/user/${user.id}`)}
                                    >
                                        My Details
                                    </Button>
                                </View>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Live Status Card - Only for Management */}
                    {/* Live Studio Status - Detailed Breakdown */}
                    {userRole !== 'NORMAL' && attendance && (
                        <Card style={[styles.card, { backgroundColor: '#e3f2fd', marginBottom: 16 }]}>
                            <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: 'bold', color: '#1565c0' }}>
                                    <MaterialCommunityIcons name="broadcast" size={20} /> Live Studio Status
                                </Text>

                                {/* Overall Total - Clickable */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#bbdefb' }}>
                                    <TouchableOpacity
                                        style={{ alignItems: 'center', flex: 1 }}
                                        onPress={() => router.push('/users')}
                                    >
                                        <Text variant="displaySmall" style={{ fontWeight: 'bold' }}>{attendance.total_users || 0}</Text>
                                        <Text variant="bodySmall">All Users</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                                            <TouchableOpacity onPress={() => router.push('/users?status=ACTIVE')}>
                                                <Text style={{ fontSize: 10, color: 'green' }}>Active: {attendance.active_users || 0}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => router.push('/users?status=INACTIVE')}>
                                                <Text style={{ fontSize: 10, color: 'grey' }}>Inactive: {attendance.inactive_users || 0}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={{ width: 1, height: 40, backgroundColor: '#bbdefb' }} />

                                    <TouchableOpacity
                                        style={{ alignItems: 'center', flex: 1 }}
                                        onPress={() => router.push('/users?punch_status=IN')}
                                    >
                                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#2e7d32' }}>{attendance.today_in || 0}</Text>
                                        <Text variant="bodySmall" style={{ color: '#2e7d32', fontWeight: 'bold' }}>Total IN</Text>
                                    </TouchableOpacity>

                                    <View style={{ width: 1, height: 40, backgroundColor: '#bbdefb' }} />

                                    <TouchableOpacity
                                        style={{ alignItems: 'center', flex: 1 }}
                                        onPress={() => router.push('/users?punch_status=OUT')}
                                    >
                                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#c62828' }}>{attendance.today_out || 0}</Text>
                                        <Text variant="bodySmall" style={{ color: '#c62828', fontWeight: 'bold' }}>Total OUT</Text>
                                    </TouchableOpacity>
                                </View>

                                {attendance.breakdown_by_role?.map((item: any, index: number) => (
                                    <View key={`role-${index}`} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', borderBottomWidth: index === attendance.breakdown_by_role.length - 1 ? 0 : 0.5, borderBottomColor: '#eee', paddingBottom: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => router.push(`/users?role=${item.role}`)}
                                            style={{ flex: 1 }}
                                        >
                                            <Text style={{ fontWeight: 'bold', color: '#1565c0', textTransform: 'capitalize' }}>
                                                {item.role.replace('_', ' ')}
                                            </Text>
                                        </TouchableOpacity>
                                        <View style={{ flexDirection: 'row', gap: 15 }}>
                                            <TouchableOpacity onPress={() => router.push(`/users?role=${item.role}&punch_status=IN`)}>
                                                <Text style={{ color: '#2e7d32', fontWeight: 'bold' }}>IN: {item.in}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => router.push(`/users?role=${item.role}&punch_status=OUT`)}>
                                                <Text style={{ color: '#c62828', fontWeight: 'bold' }}>OUT: {item.out}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </Card.Content>
                        </Card>
                    )}

                    {/* Alerts & Actions Widget */}
                    {userRole !== 'NORMAL' && (
                        <Card style={[styles.card, { marginBottom: 16 }]}>
                            <Card.Title title="Alerts & Actions" left={(props) => <MaterialCommunityIcons {...props} name="bell-ring" color="#f57c00" />} />
                            <Card.Content style={{ gap: 10 }}>
                                {attendance?.expired_monthly_count > 0 && (
                                    <Button
                                        mode="contained-tonal"
                                        icon="account-clock"
                                        buttonColor="#ffe0b2"
                                        textColor="#e65100"
                                        onPress={() => router.push('/users?filter=EXPIRED')}
                                    >
                                        {attendance.expired_monthly_count} Users Expired (Monthly)
                                    </Button>
                                )}
                                {attendance?.upcoming_expirations_count > 0 && (
                                    <Button
                                        mode="contained-tonal"
                                        icon="calendar-clock"
                                        buttonColor="#E3F2FD"
                                        textColor="#1565C0"
                                        onPress={() => router.push('/users?filter=UPCOMING_EXPIRY')}
                                    >
                                        {attendance.upcoming_expirations_count} Plans Expiring Soon
                                    </Button>
                                )}
                                {attendance?.outstanding_balance_count > 0 && (
                                    <Button
                                        mode="contained-tonal"
                                        icon="cash-multiple"
                                        buttonColor="#FFEBEE"
                                        textColor="#C62828"
                                        onPress={() => router.push('/users?filter=NEGATIVE_BALANCE')}
                                    >
                                        {attendance.outstanding_balance_count} Users with Outstanding Balance
                                    </Button>
                                )}
                                {(!attendance?.expired_monthly_count && !attendance?.upcoming_expirations_count && !attendance?.outstanding_balance_count) && (
                                    <Text style={{ color: 'gray', fontStyle: 'italic' }}>No active alerts.</Text>
                                )}
                            </Card.Content>
                        </Card>
                    )}

                    {/* Cricket Module Entry */}
                    {userRole !== 'NORMAL' && (
                        <Card style={[styles.card, { marginBottom: 16 }]}>
                            <Card.Title
                                title="Cricket Turf Manager"
                                left={(props) => <MaterialCommunityIcons {...props} name="cricket" color={theme.colors.primary} />}
                                right={(props) => <IconButton {...props} icon="chevron-right" onPress={() => router.push('/management/cricket')} />}
                            />
                            <Card.Content>
                                <Text variant="bodyMedium" style={{ color: 'gray', marginBottom: 10 }}>Manage tournaments, teams, and live scoring.</Text>
                                <Button
                                    mode="contained"
                                    onPress={() => router.push('/management/cricket')}
                                    icon="arrow-right"
                                >
                                    Go to Cricket Dashboard
                                </Button>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Financial Summary Card */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium" style={styles.cardTitle}>
                                    {userRole === 'NORMAL' ? 'My Financials' : 'Financial Summary'}
                                </Text>
                                <MaterialCommunityIcons name="finance" size={24} color={theme.colors.primary} />
                            </View>

                            <View style={styles.statRow}>
                                {userRole !== 'NORMAL' ? (
                                    <View style={styles.statItem}>
                                        <Text variant="labelMedium" style={styles.statLabel}>Income</Text>
                                        <Text variant="titleLarge" style={[styles.statValue, { color: 'green' }]}>
                                            {formatCurrency(financials?.total_income)}
                                        </Text>
                                    </View>
                                ) : (
                                    <View style={styles.statItem}>
                                        <Text variant="labelMedium" style={styles.statLabel}>Total Paid</Text>
                                        <Text variant="titleLarge" style={[styles.statValue, { color: 'green' }]}>
                                            {formatCurrency(financials?.total_charges)}
                                        </Text>
                                    </View>
                                )}

                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>
                                        {userRole === 'NORMAL' ? 'Outstanding' : 'Expenses'}
                                    </Text>
                                    <Text variant="titleLarge" style={[styles.statValue, { color: userRole === 'NORMAL' ? 'orange' : 'red' }]}>
                                        {formatCurrency(userRole === 'NORMAL' ? financials?.outstanding_balance : financials?.total_expenses)}
                                    </Text>
                                </View>
                            </View>

                            {userRole !== 'NORMAL' && (
                                <View style={[styles.statRow, { marginTop: 16 }]}>
                                    <View style={styles.statItem}>
                                        <Text variant="labelMedium" style={styles.statLabel}>Net Profit</Text>
                                        <Text variant="titleLarge" style={[styles.statValue, { color: theme.colors.primary }]}>
                                            {formatCurrency(financials?.net_profit)}
                                        </Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text variant="labelMedium" style={styles.statLabel}>Outstanding</Text>
                                        <Text variant="titleLarge" style={[styles.statValue, { color: 'orange' }]}>
                                            {formatCurrency(financials?.outstanding_balance)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </Card.Content>
                    </Card>

                    {/* Attendance Stats Card */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium" style={styles.cardTitle}>Attendance Stats</Text>
                                <MaterialCommunityIcons name="calendar-check" size={24} color={theme.colors.primary} />
                            </View>

                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>Total Visits</Text>
                                    <Text variant="titleLarge" style={styles.statValue}>{attendance?.total_attendance || 0}</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>Present Rate</Text>
                                    <Text variant="titleLarge" style={styles.statValue}>{attendance?.attendance_rate?.toFixed(1) || 0}%</Text>
                                </View>
                            </View>

                            <View style={[styles.statRow, { marginTop: 16 }]}>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>{userRole === 'NORMAL' ? 'Days Present' : 'Unique Users'}</Text>
                                    <Text variant="titleLarge" style={styles.statValue}>
                                        {userRole === 'NORMAL' ? attendance?.present_count : attendance?.unique_users || 0}
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>Avg Daily</Text>
                                    <Text variant="titleLarge" style={styles.statValue}>{attendance?.avg_daily_attendance || 0}</Text>
                                </View>
                            </View>
                        </Card.Content>
                    </Card>
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: 50, // Added padding for status bar
    },
    content: {
        padding: 16,
        paddingBottom: 120, // Increased to avoid overlap with bottom navigation
    },
    header: {
        marginBottom: 20,
        marginTop: 10,
    },
    headerTitle: {
        fontWeight: 'bold',
        color: '#333',
    },
    sectionTitle: {
        marginBottom: 12,
        fontWeight: 'bold',
        color: '#555',
        marginTop: 10,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width: '100%',
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 12,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 12,
        color: 'gray',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subValue: {
        fontSize: 10,
        color: 'gray',
        marginTop: 2,
    },
    // New styles for the updated layout
    greeting: {
        fontWeight: 'bold',
        color: '#333',
    },
    date: {
        color: 'gray',
        marginTop: 4,
    },
    loader: {
        marginTop: 40,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        color: 'gray',
        marginBottom: 4,
    },
    statValue: {
        fontWeight: 'bold',
    },
});

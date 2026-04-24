
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View, Alert } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, IconButton, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorDialog } from '../../../components/ErrorDialog';
import { useAuth } from '../../../context/AuthContext';
import apiService from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { Portal, Dialog, RadioButton, Switch } from 'react-native-paper';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user: authUser } = useAuth(); // Use Context
    const [user, setUser] = useState<any>(authUser); // Init with context user
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [financials, setFinancials] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorDetails, setErrorDetails] = useState('');

    // Punch Modal states for personal attendance
    const [punchModalVisible, setPunchModalVisible] = useState(false);
    const [bookFeeDebit, setBookFeeDebit] = useState(true);
    const [markFeePaid, setMarkFeePaid] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const currentUser = authUser || await AuthService.getUser(); // Fallback

            if (!currentUser) {
                setLoading(false);
                return;
            }

            // Refresh user details to get latest punch status
            try {
                const freshUser = await apiService.request(`/api/users/${currentUser.id}`, { skipLoader: true });
                setUser(freshUser);
            } catch (ignore) {
                setUser(currentUser); // Fallback to auth user if fetch fails
                console.log("Fresh user fetch failed, using auth user");
            }

            const canViewGlobalFinance = AuthService.hasPermission(currentUser, 'finance', 'view') || AuthService.hasPermission(currentUser, 'expense', 'view');
            const canViewGlobalAttendance = AuthService.hasPermission(currentUser, 'attendance', 'view');

            const financeQuery = canViewGlobalFinance ? '' : `?userId=${currentUser.id}`;
            const attendanceQuery = canViewGlobalAttendance ? '' : `?userId=${currentUser.id}`;

            const [finData, attData] = await Promise.all([
                apiService.request(`/api/analytics/financial-summary${financeQuery}`, { skipLoader: true }),
                apiService.request(`/api/analytics/attendance-stats${attendanceQuery}`, { skipLoader: true })
            ]);
            setFinancials(finData);
            setAttendance(attData);
        } catch (error: any) {
            console.error('Failed to load dashboard data:', error);
            setErrorMessage(error.message || 'Failed to load dashboard data');
            setErrorDetails(error.data?.details || error.body || '');
            setErrorVisible(true);
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

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Logout', 
                style: 'destructive', 
                onPress: async () => {
                    await AuthService.logout();
                    router.replace('/login');
                }
            }
        ]);
    };

    const handlePunchRequest = () => {
        if (!user) return;
        if (user.punch_status === 'IN') {
            // Straight to checkout for IN status
            handlePunchConfirm(false, false);
        } else {
            // Set defaults based on plan
            if (user.payment_frequency === 'MONTHLY') {
                setBookFeeDebit(false);
                setMarkFeePaid(false);
            } else {
                setBookFeeDebit(true);
                setMarkFeePaid(false);
            }
            setPunchModalVisible(true);
        }
    };

    const handlePunchConfirm = async (debit: boolean, credit: boolean) => {
        if (!user) return;
        setPunchModalVisible(false);
        const previousStatus = user.punch_status;
        const newStatus = previousStatus === 'IN' ? 'OUT' : 'IN';
        
        // Optimistic UI Update
        setUser({ ...user, punch_status: newStatus });

        try {
            if (previousStatus === 'IN') {
                await apiService.checkOut(user.id);
            } else {
                await apiService.checkIn(
                    user.id, 
                    new Date().toISOString(), 
                    debit, 
                    credit, 
                    user.payment_frequency === 'MONTHLY'
                );
            }
            // Refresh data to get latest stats after punch
            loadData();
        } catch (error: any) {
            console.error('Punch failed', error);
            setUser({ ...user, punch_status: previousStatus });
            
            let message = 'Failed to update attendance';
            if (error && error.status === 409) {
                message = 'You have already been checked in for today.';
            } else if (error && error.message) {
                message = typeof error.message === 'string' ? error.message : 'Attendance update failed';
            }
            Alert.alert('Attendance Error', message);
        }
    };

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top }]}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            {/* Compact Header - Merged into User Card below */}
            <View style={styles.topSection}>
                {/* HeaderProfile removed as requested to merge logic */}
                <View style={{ flex: 1 }} />
            </View>

            {/* My Status Card - Enhanced with personal details and actions */}
            {user && (
                <Card style={[styles.card, { overflow: 'hidden', marginBottom: 12 }]}>
                    <LinearGradient colors={['#e8eaf6', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12 }}>
                        {/* Top row: Avatar + Name/Plan + Actions */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Avatar.Text size={44} label={String(user.name || '?').substring(0, 2).toUpperCase()} style={{ backgroundColor: theme.colors.primary }} labelStyle={{ fontSize: 18, fontWeight: 'bold' }} />
                            
                            {/* User details section - Entirely clickable */}
                            <TouchableOpacity 
                                style={{ marginLeft: 12, flex: 1 }}
                                onPress={() => router.push({ pathname: '/management/user/[id]', params: { id: user.id } })}
                            >
                                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1a237e' }} numberOfLines={1}>{user.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                    <Text style={{ fontSize: 11, color: 'gray' }}>{user.plan_name || 'No Plan'}</Text>
                                    {user.payment_frequency && <Text style={{ fontSize: 10, color: '#7986cb', fontWeight: 'bold' }}>· {user.payment_frequency}</Text>}
                                    {user.group?.name && <Text style={{ fontSize: 10, color: '#546e7a' }}>· {user.group.name}</Text>}
                                </View>
                                <View style={{ marginTop: 2 }}>
                                    {user.email && <Text style={{ fontSize: 10, color: '#757575' }}><MaterialCommunityIcons name="email-outline" size={10} /> {user.email}</Text>}
                                    {user.phone && <Text style={{ fontSize: 10, color: '#757575' }}><MaterialCommunityIcons name="phone-outline" size={10} /> {user.phone}</Text>}
                                </View>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <TouchableOpacity
                                    style={{ padding: 8, borderRadius: 20, backgroundColor: user.punch_status === 'IN' ? '#ffebee' : '#e8f5e9' }}
                                    onPress={handlePunchRequest}
                                >
                                    <MaterialCommunityIcons 
                                        name={user.punch_status === 'IN' ? 'logout' : 'login'} 
                                        size={22} 
                                        color={user.punch_status === 'IN' ? '#c62828' : '#2e7d32'} 
                                    />
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                    style={{ padding: 8, borderRadius: 20, backgroundColor: '#ffebee' }}
                                    onPress={handleLogout}
                                >
                                    <MaterialCommunityIcons name="logout-variant" size={22} color="#d32f2f" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        {/* Stats row: Paid | Due — clean, no redundant punch status */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: 'gray' }}>Paid</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#2e7d32' }}>₹{user.total_credits || 0}</Text>
                            </View>
                            <View style={{ width: 1, height: 32, backgroundColor: '#c5cae9', marginHorizontal: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, color: 'gray' }}>{(user.balance || 0) > 0 ? 'Due' : 'Advance'}</Text>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: (user.balance || 0) > 0 ? '#c62828' : '#2e7d32' }}>₹{Math.abs(user.balance || 0)}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Card>
            )}

            {loading && !refreshing ? (
                <ActivityIndicator size="large" style={styles.loader} />
            ) : (
                <>

                    {/* Live Studio Status - Iconic Grid Breakdown */}
                    {AuthService.hasPermission(authUser, 'attendance', 'view') && attendance && (
                            <Card style={[styles.card, { overflow: 'hidden' }]}>
                                <LinearGradient colors={['#e3f2fd', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12 }}>
                                    <View style={styles.cardHeader}>
                                        <Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#1565c0' }}>
                                            <MaterialCommunityIcons name="broadcast" size={20} /> Live Studio
                                        </Text>
                                        <IconButton icon="refresh" size={18} onPress={loadData} style={{ margin: -10 }} />
                                    </View>

                                    {/* Overall Totals Row */}
                                    <View style={styles.totalsRow}>
                                        <TouchableOpacity style={styles.totalItem} onPress={() => router.push('/users')}>
                                            <MaterialCommunityIcons name="account-group" size={24} color="#1976d2" />
                                            <Text style={styles.totalValue}>{attendance.total_users || 0}</Text>
                                            <Text style={styles.totalLabel}>Users</Text>
                                    </TouchableOpacity>
                                        <View style={styles.divider} />
                                        <TouchableOpacity style={styles.totalItem} onPress={() => router.push('/users?punch_status=IN')}>
                                            <MaterialCommunityIcons name="login" size={24} color="#2e7d32" />
                                            <Text style={[styles.totalValue, { color: '#2e7d32' }]}>{attendance.today_in || 0}</Text>
                                            <Text style={[styles.totalLabel, { color: '#2e7d32' }]}>Total IN</Text>
                                        </TouchableOpacity>
                                        <View style={styles.divider} />
                                        <TouchableOpacity style={styles.totalItem} onPress={() => router.push('/users?punch_status=OUT')}>
                                            <MaterialCommunityIcons name="logout" size={24} color="#c62828" />
                                            <Text style={[styles.totalValue, { color: '#c62828' }]}>{attendance.today_out || 0}</Text>
                                            <Text style={[styles.totalLabel, { color: '#c62828' }]}>Total OUT</Text>
                                    </TouchableOpacity>
                                </View>

                                    {/* Role Breakdown - Horizontal Pill Row */}
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                                        <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                                            {attendance.breakdown_by_role?.map((item: any, index: number) => {
                                                const roleIcons: Record<string, string> = {
                                                    'SUPER_ADMIN': 'account-star',
                                                    'MANAGEMENT': 'account-tie',
                                                    'STAFF': 'account-wrench',
                                                    'USER': 'account',
                                                    'NORMAL': 'account-outline'
                                                };
                                                const roleColors: Record<string, string> = {
                                                    'SUPER_ADMIN': '#7b1fa2',
                                                    'MANAGEMENT': '#1565c0',
                                                    'STAFF': '#00695c',
                                                    'USER': '#37474f',
                                                    'NORMAL': '#37474f'
                                                };
                                                const color = roleColors[item.role] || '#37474f';
                                                return (
                                                    <TouchableOpacity
                                                    key={`role-${index}`}
                                                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, elevation: 1, gap: 5, borderWidth: 1, borderColor: color + '30' }}
                                                    onPress={() => router.push(`/users?role=${item.role}`)}
                                                >
                                                    <MaterialCommunityIcons name={(roleIcons[item.role] || 'account') as any} size={13} color={color} />
                                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color, textTransform: 'capitalize' }}>
                                                        {item.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                                    </Text>
                                                    <View style={{ flexDirection: 'row', gap: 4 }}>
                                                        <View style={{ backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#2e7d32' }}>{item.in}↑</Text>
                                                        </View>
                                                        <View style={{ backgroundColor: '#ffebee', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#c62828' }}>{item.out}↓</Text>
                                                        </View>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        </View>
                                    </ScrollView>
                                </LinearGradient>
                        </Card>
                    )}

                    {/* Alerts & Actions Widget */}
                    {AuthService.hasPermission(authUser, 'user', 'view') && (
                            <Card style={[styles.card, { marginBottom: 12 }]}>
                                <Card.Title
                                    title="Alerts & Actions"
                                    titleStyle={{ fontSize: 14, fontWeight: 'bold' }}
                                    leftStyle={{ marginRight: -10 }}
                                    left={(props) => <MaterialCommunityIcons {...props} size={20} name="bell-ring" color="#f57c00" />}
                                />
                                <Card.Content style={{ gap: 6, marginTop: -10 }}>
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
                    {AuthService.hasPermission(authUser, 'cricket_scoring', 'view') && (
                            <TouchableOpacity style={[styles.card, { overflow: 'hidden' }]} onPress={() => router.push('/management/cricket')} activeOpacity={0.8}>
                                <LinearGradient colors={['#e8f4fd', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <MaterialCommunityIcons name="cricket" size={26} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#1565c0' }}>Cricket Turf Manager</Text>
                                        <Text style={{ fontSize: 11, color: 'gray', marginTop: 2 }}>Tournaments · Teams · Live Scoring</Text>
                                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                                            {['Tournaments', 'Teams', 'Matches'].map(f => (
                                                <View key={f} style={{ backgroundColor: theme.colors.primary + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                                                    <Text style={{ fontSize: 9, color: theme.colors.primary, fontWeight: 'bold' }}>{f}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={22} color="#bbb" />
                                </LinearGradient>
                            </TouchableOpacity>
                    )}

                    {/* Financial Summary Card */}
                    <Card style={[styles.card, { overflow: 'hidden' }]}>
                        <LinearGradient colors={['#e8f5e9', '#fff']} start={{x:0,y:0}} end={{x:1,y:1}} style={{ padding: 12 }}>
                            {/* Header row with title + action buttons */}
                            <View style={styles.cardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <MaterialCommunityIcons name="finance" size={16} color="#2e7d32" />
                                    <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#2e7d32' }}>Financial Summary</Text>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {AuthService.hasPermission(authUser, 'finance', 'view') && (
                                        <TouchableOpacity style={{ backgroundColor: '#e8f5e9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }} onPress={() => router.push('/management/ledgers')}>
                                            <MaterialCommunityIcons name="cash-plus" size={12} color="#2e7d32" />
                                            <Text style={{ fontSize: 10, color: '#2e7d32', fontWeight: 'bold' }}>Payments</Text>
                                        </TouchableOpacity>
                                    )}
                                    {AuthService.hasPermission(authUser, 'expense', 'view') && (
                                        <TouchableOpacity style={{ backgroundColor: '#ffebee', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }} onPress={() => router.push('/management/expenses')}>
                                            <MaterialCommunityIcons name="cash-minus" size={12} color="#c62828" />
                                            <Text style={{ fontSize: 10, color: '#c62828', fontWeight: 'bold' }}>Expenses</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            {/* Single row: Income | Expenses | Net Profit | Outstanding */}
                            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8 }}>
                                {AuthService.hasPermission(authUser, 'finance', 'view') ? (
                                    <>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Income</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2e7d32' }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.total_income)}</Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: '#c8e6c9', marginHorizontal: 4 }} />
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Expenses</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#c62828' }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.total_expenses)}</Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: '#c8e6c9', marginHorizontal: 4 }} />
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Net Profit</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.colors.primary }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.net_profit)}</Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: '#c8e6c9', marginHorizontal: 4 }} />
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Outstanding</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#f57c00' }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.outstanding_balance)}</Text>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Total Paid</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2e7d32' }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.total_charges)}</Text>
                                        </View>
                                        <View style={{ width: 1, backgroundColor: '#c8e6c9', marginHorizontal: 4 }} />
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9, color: 'gray', marginBottom: 2 }}>Outstanding</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#f57c00' }} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(financials?.outstanding_balance)}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </LinearGradient>
                    </Card>

                    {/* Attendance Stats Card */}
                        <Card style={[styles.card, { overflow: 'hidden' }]}>
                            <LinearGradient colors={['#fff3e0', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 12 }}>
                            <View style={styles.cardHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <MaterialCommunityIcons name="calendar-check" size={18} color="#e65100" />
                                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: '#e65100' }}>Attendance Stats</Text>
                                    </View>
                                </View>
                                {/* Attendance Rate Mini Bar */}
                                {(() => {
                                    const rate = attendance?.attendance_rate || 0; return (
                                        <View style={{ marginBottom: 12 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 11, color: 'gray' }}>Present Rate</Text>
                                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: rate > 70 ? '#2e7d32' : rate > 40 ? '#f57c00' : '#c62828' }}>{rate.toFixed(1)}%</Text>
                                            </View>
                                        <View style={{ height: 6, backgroundColor: '#ffe0b2', borderRadius: 3 }}>
                                            <View style={{ height: 6, width: `${Math.min(rate, 100)}%` as any, backgroundColor: rate > 70 ? '#4caf50' : rate > 40 ? '#ff9800' : '#f44336', borderRadius: 3 }} />
                                        </View>
                                </View>
                                );
                                })()}
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <View style={[styles.attStatTile, { borderLeftColor: '#e65100' }]}>
                                        <MaterialCommunityIcons name="calendar-multiple" size={18} color="#e65100" />
                                        <Text style={styles.finStatValue}>{attendance?.total_attendance || 0}</Text>
                                        <Text style={styles.finStatLabel}>Total Visits</Text>
                                    </View>
                                    <View style={[styles.attStatTile, { borderLeftColor: '#1565c0' }]}>
                                        <MaterialCommunityIcons name="account-multiple" size={18} color="#1565c0" />
                                        <Text style={styles.finStatValue}>{AuthService.hasPermission(authUser, 'attendance', 'view') ? attendance?.unique_users || 0 : attendance?.present_count || 0}</Text>
                                        <Text style={styles.finStatLabel}>{AuthService.hasPermission(authUser, 'attendance', 'view') ? 'Unique Users' : 'Days Present'}</Text>
                                    </View>
                                    <View style={[styles.attStatTile, { borderLeftColor: '#7b1fa2' }]}>
                                        <MaterialCommunityIcons name="chart-bar" size={18} color="#7b1fa2" />
                                        <Text style={styles.finStatValue}>{attendance?.avg_daily_attendance || 0}</Text>
                                        <Text style={styles.finStatLabel}>Avg Daily</Text>
                                </View>
                            </View>
                            </LinearGradient>
                    </Card>
                </>
            )}
            <ErrorDialog
                visible={errorVisible}
                message={errorMessage}
                details={errorDetails}
                onDismiss={() => setErrorVisible(false)}
            />

            {/* Attendance Confirmation Modal (Personal) */}
            <Portal>
                <Dialog visible={punchModalVisible} onDismiss={() => setPunchModalVisible(false)}>
                    <Dialog.Title>Punch IN - {user?.name || 'Self'}</Dialog.Title>
                    <Dialog.Content>
                        {user?.payment_frequency ? (
                            <View>
                                <Text style={{ marginBottom: 12, color: 'gray' }}>
                                    Record {String(user.payment_frequency).toLowerCase()} billing for this check-in.
                                </Text>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <Text>Book Billing Entry?</Text>
                                    <Switch value={bookFeeDebit} onValueChange={setBookFeeDebit} />
                                </View>

                                {bookFeeDebit && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Payment Status:</Text>
                                        <RadioButton.Group onValueChange={value => setMarkFeePaid(value === 'paid')} value={markFeePaid ? 'paid' : 'unpaid'}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <RadioButton value="unpaid" />
                                                <Text>Add to Due Balance</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <RadioButton value="paid" />
                                                <Text>Mark as Paid (Credit)</Text>
                                            </View>
                                        </RadioButton.Group>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <Text>Confirm your check-in for today?</Text>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPunchModalVisible(false)}>Cancel</Button>
                        <Button 
                            mode="contained" 
                            onPress={() => handlePunchConfirm(bookFeeDebit, markFeePaid)}
                            buttonColor="#4CAF50"
                        >
                            Confirm IN
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    content: {
        padding: 16,
        paddingBottom: 120, // Increased to avoid overlap with bottom navigation
    },
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
    },
    card: {
        width: '100%',
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 2,
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    totalItem: {
        alignItems: 'center',
        flex: 1,
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 2,
    },
    totalLabel: {
        fontSize: 10,
        color: '#666',
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#bbdefb',
    },
    roleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    roleCard: {
        width: '48.5%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    roleName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1565c0',
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    roleIn: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#2e7d32',
    },
    roleOut: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#c62828',
    },
    loader: {
        marginTop: 40,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    finStatTile: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        elevation: 1,
        borderLeftWidth: 3,
        borderLeftColor: '#2e7d32',
    },
    finStatValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1a237e',
        marginTop: 3,
    },
    finStatLabel: {
        fontSize: 10,
        color: 'gray',
        marginTop: 2,
    },
    attStatTile: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        alignItems: 'center',
        elevation: 1,
        borderLeftWidth: 3,
    },
});

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AuthService } from '../../../services/auth.service';

import HeaderProfile from '../../../components/HeaderProfile';

export default function DashboardScreen() {
    const theme = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [financials, setFinancials] = useState<any>(null);
    const [attendance, setAttendance] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('NORMAL');

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await AuthService.getUser();
            setUserRole(user?.role || 'NORMAL');

            const queryParams = (user?.role === 'NORMAL') ? `?userId=${user.id}` : '';

            const [finData, attData] = await Promise.all([
                apiService.request(`/api/analytics/financial-summary${queryParams}`),
                apiService.request(`/api/analytics/attendance-stats${queryParams}`)
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
                    {/* Live Status Card - Only for Management */}
                    {userRole !== 'NORMAL' && attendance && (
                        <Card style={[styles.card, { backgroundColor: '#e3f2fd', marginBottom: 16 }]}>
                            <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 10, fontWeight: 'bold', color: '#1565c0' }}>
                                    <MaterialCommunityIcons name="broadcast" size={20} /> Live Studio Status
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ alignItems: 'center' }}>
                                        <Text variant="displaySmall" style={{ fontWeight: 'bold' }}>{attendance.total_active_users || 0}</Text>
                                        <Text variant="bodySmall">Total Users</Text>
                                    </View>
                                    <View style={{ width: 1, height: 40, backgroundColor: '#bbdefb' }} />
                                    <View style={{ alignItems: 'center' }}>
                                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#2e7d32' }}>{attendance.today_in || 0}</Text>
                                        <Text variant="bodySmall" style={{ color: '#2e7d32', fontWeight: 'bold' }}>IN</Text>
                                    </View>
                                    <View style={{ width: 1, height: 40, backgroundColor: '#bbdefb' }} />
                                    <View style={{ alignItems: 'center' }}>
                                        <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: '#c62828' }}>{attendance.today_out || 0}</Text>
                                        <Text variant="bodySmall" style={{ color: '#c62828', fontWeight: 'bold' }}>OUT</Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Financial Summary Card */}
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.cardHeader}>
                                <Text variant="titleMedium" style={styles.cardTitle}>Financial Summary</Text>
                                <MaterialCommunityIcons name="finance" size={24} color={theme.colors.primary} />
                            </View>

                            <View style={styles.statRow}>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>Income</Text>
                                    <Text variant="titleLarge" style={[styles.statValue, { color: 'green' }]}>
                                        {formatCurrency(financials?.total_income)}
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text variant="labelMedium" style={styles.statLabel}>{userRole === 'NORMAL' ? 'My Payments' : 'Expenses'}</Text>
                                    <Text variant="titleLarge" style={[styles.statValue, { color: 'red' }]}>
                                        {formatCurrency(userRole === 'NORMAL' ? financials?.total_charges : financials?.total_expenses)}
                                    </Text>
                                </View>
                            </View>

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
        paddingBottom: 40,
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

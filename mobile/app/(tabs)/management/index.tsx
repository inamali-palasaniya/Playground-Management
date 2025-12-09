import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import apiService from '../../../services/api.service';

export default function ManagementDashboard() {
    const theme = useTheme();
    const router = useRouter();
    const [financials, setFinancials] = useState<{ total_income: number; total_expenses: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [isManagement, setIsManagement] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
            setIsManagement(apiService.isManagement());
        }, [])
    );

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const data = await apiService.getFinancialSummary();
            setFinancials(data);
            setIsManagement(apiService.isManagement()); // Re-check role
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProtectedAction = (route: any) => { // Use 'any' or correct string union type for route
        if (!isManagement) {
            alert('Access Denied: Management role required');
            return;
        }
        router.push(route);
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineMedium" style={styles.header}>Dashboard</Text>

            <View style={styles.statsContainer}>
                <Card style={[styles.card, styles.cardLeft]}>
                    <Card.Content>
                        <Text variant="titleMedium">Income</Text>
                        {loading ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <Text variant="headlineSmall" style={styles.incomeText}>
                                ₹{financials?.total_income || 0}
                            </Text>
                        )}
                    </Card.Content>
                </Card>
                <Card style={[styles.card, styles.cardRight]}>
                    <Card.Content>
                        <Text variant="titleMedium">Expenses</Text>
                        {loading ? (
                            <ActivityIndicator size="small" />
                        ) : (
                            <Text variant="headlineSmall" style={styles.expenseText}>
                                ₹{financials?.total_expenses || 0}
                            </Text>
                        )}
                    </Card.Content>
                </Card>
            </View>

            <Card style={styles.card}>
                <Card.Title title="Quick Actions" />
                <Card.Content style={styles.actionsContent}>
                    <Button mode="contained" icon="account-plus" style={styles.actionButton} onPress={() => handleProtectedAction('/management/add-user')} disabled={!isManagement}>
                        Add User
                    </Button>
                    <Button mode="contained" icon="card-account-details" style={styles.actionButton} onPress={() => handleProtectedAction('/management/subscription-plans')} disabled={!isManagement}>
                        Subscriptions
                    </Button>
                    <Button mode="contained" icon="calendar-check" style={styles.actionButton} onPress={() => router.push('/management/attendance')}>
                        Attendance
                    </Button>
                    <Button mode="contained" icon="gavel" style={styles.actionButton} onPress={() => handleProtectedAction('/management/fine-rules')} disabled={!isManagement}>
                        Fine Rules
                    </Button>
                    <Button mode="contained" icon="alert-circle" style={styles.actionButton} buttonColor="#FF9800" onPress={() => handleProtectedAction('/management/apply-fine')} disabled={!isManagement}>
                        Apply Fine
                    </Button>
                    <Button mode="contained" icon="cash-plus" style={styles.actionButton} onPress={() => handleProtectedAction('/management/add-fee')} disabled={!isManagement}>
                        Add Fee
                    </Button>
                    <Button mode="contained" icon="cash-minus" style={styles.actionButton} buttonColor={theme.colors.error} onPress={() => handleProtectedAction('/management/add-expense')} disabled={!isManagement}>
                        Add Expense
                    </Button>
                    <Button mode="outlined" icon="file-document" style={styles.actionButton} onPress={() => router.push('/management/reports')}>
                        Reports
                    </Button>
                </Card.Content>
            </Card>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        marginBottom: 16,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    card: {
        backgroundColor: 'white',
        marginBottom: 16,
    },
    cardLeft: {
        flex: 1,
        marginRight: 8,
    },
    cardRight: {
        flex: 1,
        marginLeft: 8,
    },
    incomeText: {
        color: '#16a34a',
    },
    expenseText: {
        color: '#dc2626',
    },
    actionsContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionButton: {
        marginBottom: 8,
        width: '48%',
    },
});

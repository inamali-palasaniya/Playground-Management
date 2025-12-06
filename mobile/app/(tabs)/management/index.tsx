import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function ManagementDashboard() {
    const theme = useTheme();
    const router = useRouter();

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineMedium" style={styles.header}>Dashboard</Text>

            <View style={styles.statsContainer}>
                <Card style={[styles.card, styles.cardLeft]}>
                    <Card.Content>
                        <Text variant="titleMedium">Income</Text>
                        <Text variant="headlineSmall" style={styles.incomeText}>$5,200</Text>
                    </Card.Content>
                </Card>
                <Card style={[styles.card, styles.cardRight]}>
                    <Card.Content>
                        <Text variant="titleMedium">Expenses</Text>
                        <Text variant="headlineSmall" style={styles.expenseText}>$1,800</Text>
                    </Card.Content>
                </Card>
            </View>

            <Card style={styles.card}>
                <Card.Title title="Quick Actions" />
                <Card.Content style={styles.actionsContent}>
                    <Button mode="contained" icon="account-plus" style={styles.actionButton} onPress={() => router.push('/management/add-user')}>
                        Add User
                    </Button>
                    <Button mode="contained" icon="card-account-details" style={styles.actionButton} onPress={() => router.push('/management/subscription-plans')}>
                        Subscriptions
                    </Button>
                    <Button mode="contained" icon="calendar-check" style={styles.actionButton} onPress={() => router.push('/management/attendance')}>
                        Attendance
                    </Button>
                    <Button mode="contained" icon="cash-plus" style={styles.actionButton} onPress={() => { }}>
                        Add Fee
                    </Button>
                    <Button mode="contained" icon="cash-minus" style={styles.actionButton} buttonColor={theme.colors.error} onPress={() => { }}>
                        Add Expense
                    </Button>
                    <Button mode="outlined" icon="file-document" style={styles.actionButton} onPress={() => { }}>
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

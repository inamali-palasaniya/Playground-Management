
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton, useTheme, DataTable, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';
import apiService from '../../../services/api.service';
import AuditLogDialog from '../../components/AuditLogDialog';

export default function LedgerDetailScreen() {
    const { id, userId } = useLocalSearchParams(); // ledger id
    const [entry, setEntry] = useState<any>(null);
    const [children, setChildren] = useState<any[]>([]);
    const [parent, setParent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [auditVisible, setAuditVisible] = useState(false);



    const router = useRouter();
    const theme = useTheme();

    const loadData = async () => {
        try {
            const uId = userId ? parseInt(userId as string) : undefined;
            if (!uId) {
                alert("Missing User ID");
                return;
            }

            const allLedger = await apiService.getUserLedger(uId);
            const currentId = parseInt(id as string);
            const foundEntry = allLedger.find((l: any) => l.id === currentId);

            if (foundEntry) {
                setEntry(foundEntry);

                // Find Children (Payments for this Debit)
                const kids = allLedger.filter((l: any) => l.parent_ledger_id === currentId);
                setChildren(kids);

                // Find Parent (If this is a Credit linked to something)
                if (foundEntry.parent_ledger_id) {
                    const dad = allLedger.find((l: any) => l.id === foundEntry.parent_ledger_id);
                    setParent(dad);
                }
            } else {
                setEntry(null); // Not found
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && userId) loadData();
    }, [id, userId]);

    // Actions
    const handleDelete = async (itemId: number, isMain: boolean = false) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this record? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await apiService.deleteLedgerEntry(itemId);
                            if (isMain) {
                                router.back();
                            } else {
                                loadData();
                            }
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = (item: any) => {
        router.push({
            pathname: '/management/add-payment',
            params: {
                editId: item.id,
                userId: userId,
                initialAmount: item.amount,
                initialNotes: item.notes,
                initialDate: item.date,
                initialType: item.type,
                initialMethod: item.payment_method,
                initialTxType: item.transaction_type
            }
        });
    };

    if (loading && !entry) return <View style={styles.loading}><ActivityIndicator /></View>;
    if (!entry) return <View style={styles.container}><Text>Entry not found</Text></View>;

    const isDebit = entry.transaction_type === 'DEBIT';
    const totalPaid = children.reduce((sum, c) => sum + c.amount, 0);
    const remaining = Math.max(0, entry.amount - totalPaid);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="headlineSmall">Transaction Details #{entry.id}</Text>
                <View style={{ flex: 1 }} />
                {/* Main Entry Actions possible here too */}
                <IconButton icon="history" iconColor="#607D8B" onPress={() => setAuditVisible(true)} />
                <IconButton icon="pencil" onPress={() => handleEdit(entry)} />
                <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(entry.id, true)} />
            </View>

            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.row}>
                        <Text variant="titleMedium">Type</Text>
                        <Text variant="bodyLarge">{entry.type}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="titleMedium">Amount</Text>
                        <Text variant="headlineMedium" style={{ color: isDebit ? 'black' : 'green' }}>
                            {isDebit ? '-' : '+'}₹{entry.amount}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text variant="titleMedium">Date</Text>
                        <Text variant="bodyLarge">{format(new Date(entry.date), 'dd MMM yyyy, HH:mm')}</Text>
                    </View>
                    {entry.notes && (
                        <View style={{ marginTop: 10 }}>
                            <Text variant="titleMedium">Notes</Text>
                            <Text variant="bodyMedium">{entry.notes}</Text>
                        </View>
                    )}
                    <View style={[styles.row, { marginTop: 10 }]}>
                        <Text variant="titleMedium">Status</Text>
                        <Text variant="labelLarge" style={{ color: entry.is_paid ? 'green' : 'red', fontWeight: 'bold' }}>
                            {entry.is_paid ? 'PAID' : 'UNPAID'}
                        </Text>
                    </View>
                </Card.Content>
            </Card>

            {/* If DEBIT: Show Payment History */}
            {isDebit && (
                <>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Payment History</Text>
                    <Card style={styles.card}>
                        <Card.Content>
                            <View style={styles.row}>
                                <Text>Total Amount</Text>
                                <Text>₹{entry.amount}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text>Paid So Far</Text>
                                <Text style={{ color: 'green' }}>₹{totalPaid}</Text>
                            </View>
                            <Divider style={{ marginVertical: 10 }} />
                            <View style={styles.row}>
                                <Text variant="titleMedium">Remaining</Text>
                                <Text variant="titleMedium" style={{ color: remaining > 0 ? 'red' : 'green' }}>₹{remaining}</Text>
                            </View>

                            {/* Pay Button */}
                            {remaining > 0 && !entry.is_paid && (
                                <Button
                                    mode="contained"
                                    style={{ marginTop: 20 }}
                                    onPress={() => router.push({
                                        pathname: '/management/add-payment',
                                        params: {
                                            userId,
                                            userName: 'User',
                                            linkedChargeId: entry.id,
                                            linkedAmount: remaining, // Suggest remaining amount
                                            linkedType: entry.type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PAYMENT'
                                        }
                                    })}
                                >
                                    Pay Remaining (₹{remaining})
                                </Button>
                            )}
                        </Card.Content>
                    </Card>

                    {children.length > 0 && (
                        <View style={{ marginTop: 10 }}>
                            <Text variant="titleMedium" style={styles.sectionTitle}>Transactions</Text>
                            {children.map(child => (
                                <Card
                                    key={child.id}
                                    style={[styles.card, { marginTop: 5 }]}
                                    onPress={() => router.push({ pathname: '/management/ledger/[id]', params: { id: child.id, userId } })}
                                >
                                    <Card.Content style={styles.row}>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="bodyMedium">Payment #{child.id}</Text>
                                            <Text variant="bodySmall" style={{ color: 'gray' }}>{format(new Date(child.date), 'dd MMM')}</Text>
                                        </View>
                                        <Text style={{ color: 'green', fontWeight: 'bold', marginRight: 10 }}>₹{child.amount}</Text>
                                        <View style={{ flexDirection: 'row' }}>
                                            <IconButton icon="pencil" size={20} onPress={() => handleEdit(child)} />
                                            <IconButton icon="delete" size={20} iconColor="red" onPress={() => handleDelete(child.id)} />
                                        </View>
                                    </Card.Content>
                                </Card>
                            ))}
                        </View>
                    )}
                </>
            )}

            {/* If CREDIT and Linked: Show Parent */}
            {!isDebit && parent && (
                <>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Applied To</Text>
                    <Card style={styles.card} onPress={() => router.push({ pathname: '/management/ledger/[id]', params: { id: parent.id, userId } })}>
                        <Card.Content>
                            <Text variant="titleMedium">{parent.type}</Text>
                            <Text>Charge #{parent.id}</Text>
                            <Text>Total Charge: ₹{parent.amount}</Text>
                        </Card.Content>
                    </Card>
                </>
            )}

            <AuditLogDialog
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="LEDGER"
                entityId={entry?.id} // Use entry.id directly
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 40 },
    card: { marginBottom: 15, backgroundColor: 'white' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    sectionTitle: { marginVertical: 10, marginLeft: 5, color: '#666' }
});

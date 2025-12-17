import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Appbar, useTheme, Card, Text, FAB, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import AuditLogDialog from '../../components/AuditLogDialog';

export default function ExpenseListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await apiService.getExpenses();
            setExpenses(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadExpenses();
        }, [])
    );

    const handleDelete = (id: number) => {
        Alert.alert('Delete Expense', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/expenses/${id}`, { method: 'DELETE' });
                        loadExpenses();
                    } catch (e: any) {
                        Alert.alert('Error', 'Failed to delete expense');
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/expenses/add-expense', params: { id: item.id } })}>
            <Card.Content style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                    <Text variant="titleMedium">{item.category}</Text>
                    <Text variant="bodySmall">{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                    {item.notes && <Text variant="bodySmall" numberOfLines={1} style={{ color: 'gray' }}>{item.notes}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 0 }}>
                    <Text variant="titleMedium" style={{ color: '#d32f2f', fontWeight: 'bold', marginRight: 10 }}>₹{item.amount}</Text>
                    <IconButton icon="history" size={20} iconColor="#607D8B" onPress={() => { setAuditEntityId(item.id); setAuditVisible(true); }} />
                    <IconButton icon="pencil" size={20} iconColor="#1976d2" onPress={() => router.push({ pathname: '/management/expenses/add-expense', params: { id: item.id } })} />
                    <IconButton icon="delete" size={20} iconColor="red" onPress={() => handleDelete(item.id)} />
                </View>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Expenses" titleStyle={{ color: 'white' }} />
            </Appbar.Header>

            {loading ? (
                <View style={styles.centered}><ActivityIndicator /></View>
            ) : (
                <FlatList
                    data={expenses}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No expenses found.</Text>}
                />
            )}

            <FAB
                icon="plus"
                style={styles.fab}
                label="Add Expense"
                onPress={() => router.push('/management/expenses/add-expense')}
            />

            <AuditLogDialog
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="EXPENSE"
                entityId={auditEntityId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginBottom: 12, backgroundColor: 'white' },
    cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 }
});

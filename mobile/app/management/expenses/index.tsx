import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Appbar, useTheme, Card, Text, FAB, ActivityIndicator, IconButton, Menu, Chip } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import AuditLogDialog from '../../components/AuditLogDialog';
import { useAuth } from '../../../context/AuthContext';
import { AuthService } from '../../../services/auth.service';

export default function ExpenseListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);

    // Filter Logic
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await apiService.getExpenses(selectedCategory || undefined);
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
            if (!AuthService.hasPermission(user, 'expense', 'view')) {
                Alert.alert('Access Denied', 'You do not have permission to view this module.', [{ text: 'Go Back', onPress: () => router.back() }]);
                return;
            }
            loadExpenses();

            // Load categories for filter
            apiService.request('/api/masters/expense-categories')
                .then(data => setCategories(data as any[]))
                .catch(console.error);
        }, [user, selectedCategory]) // Reload when filter changes
    );

    const handleDelete = (id: number) => {
        if (!AuthService.hasPermission(user, 'expense', 'delete')) {
            Alert.alert('Permission Denied', 'You cannot delete expenses.');
            return;
        }
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
        <Card style={styles.card} onPress={() => {
            if (AuthService.hasPermission(user, 'expense', 'edit')) {
                router.push({ pathname: '/management/expenses/add-expense', params: { id: item.id } });
            }
        }}>
            <Card.Content style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                    <Text variant="titleMedium">{item.category}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.primary }}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                    {item.notes && <Text variant="bodySmall" numberOfLines={1} style={{ color: 'gray' }}>{item.notes}</Text>}
                    <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic', marginTop: 2 }}>
                        By: {item.created_by?.name || 'N/A'} • {item.createdAt ? format(new Date(item.createdAt), 'HH:mm') : ''}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 0 }}>
                    <Text variant="titleMedium" style={{ color: '#d32f2f', fontWeight: 'bold', marginRight: 10 }}>₹{item.amount}</Text>
                    {AuthService.hasPermission(user, 'expense', 'view') && <IconButton icon="history" size={20} iconColor="#607D8B" onPress={() => { setAuditEntityId(item.id); setAuditVisible(true); }} />}
                    {AuthService.hasPermission(user, 'expense', 'edit') && <IconButton icon="pencil" size={20} iconColor="#1976d2" onPress={() => router.push({ pathname: '/management/expenses/add-expense', params: { id: item.id } })} />}
                    {AuthService.hasPermission(user, 'expense', 'delete') && <IconButton icon="delete" size={20} iconColor="red" onPress={() => handleDelete(item.id)} />}
                </View>
            </Card.Content>
        </Card>
    );

    if (!AuthService.hasPermission(user, 'expense', 'view')) {
        return <View style={styles.centered}><Text>Access Denied</Text></View>;
    }

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Expenses" titleStyle={{ color: 'white' }} />
                <Menu
                    visible={filterMenuVisible}
                    onDismiss={() => setFilterMenuVisible(false)}
                    anchor={<Appbar.Action icon={selectedCategory ? "filter" : "filter-outline"} color="white" onPress={() => setFilterMenuVisible(true)} />}
                >
                    <Menu.Item onPress={() => { setSelectedCategory(null); setFilterMenuVisible(false); }} title="All" leadingIcon={!selectedCategory ? "check" : undefined} />
                    {categories.map((cat) => (
                        <Menu.Item
                            key={cat.id}
                            onPress={() => { setSelectedCategory(cat.name); setFilterMenuVisible(false); }}
                            title={cat.name}
                            leadingIcon={selectedCategory === cat.name ? "check" : undefined}
                        />
                    ))}
                </Menu>
            </Appbar.Header>

            {selectedCategory && (
                <View style={{ padding: 10, paddingBottom: 0 }}>
                    <Chip onClose={() => setSelectedCategory(null)} icon="filter">{selectedCategory}</Chip>
                </View>
            )}

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

            {AuthService.hasPermission(user, 'expense', 'add') && (
                <FAB
                    icon="plus"
                    style={styles.fab}
                    label="Add Expense"
                    onPress={() => router.push('/management/expenses/add-expense')}
                />
            )}

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

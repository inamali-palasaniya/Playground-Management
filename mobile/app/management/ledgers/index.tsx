import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Appbar, useTheme, Card, Text, FAB, ActivityIndicator, IconButton, Menu, Chip } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';
import AuditLogDialog from '../../components/AuditLogDialog';
import { useAuth } from '../../../context/AuthContext';
import { AuthService } from '../../../services/auth.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LedgerListScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();
    const [ledgers, setLedgers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);

    // Filter Logic
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);

    const loadLedgers = async () => {
        try {
            setLoading(true);
            const data = await apiService.getAllLedgers(selectedType ? { type: selectedType, transactionType: 'CREDIT' } : { transactionType: 'CREDIT' });
            setLedgers(data);
        } catch (error: any) {
            if (error.status !== 401) {
                console.error(error);
                Alert.alert('Error', 'Failed to load payments');
            }
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!user) return; // Wait for user to load

            if (!AuthService.hasPermission(user, 'ledger', 'view')) {
                Alert.alert('Access Denied', 'You do not have permission to view this module.', [{ text: 'Go Back', onPress: () => router.back() }]);
                return;
            }
            loadLedgers();
        }, [user, selectedType])
    );

    const handleDelete = (id: number) => {
        if (!AuthService.hasPermission(user, 'ledger', 'delete')) {
            Alert.alert('Permission Denied', 'You cannot delete payments.');
            return;
        }
        Alert.alert('Delete Payment', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.deleteLedgerEntry(id);
                        // Optimistically remove from list immediately
                        setLedgers(prev => prev.filter(l => l.id !== id));
                    } catch (e: any) {
                        Alert.alert('Error', 'Failed to delete payment');
                        loadLedgers(); // Re-sync on error
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card} onPress={() => {
            if (AuthService.hasPermission(user, 'ledger', 'edit')) {
                router.push({ pathname: '/management/add-payment', params: { editId: item.id, initialAmount: item.amount, initialNotes: item.notes, initialDate: item.date, initialType: item.type, initialMethod: item.payment_method, initialTxType: item.transaction_type, teamId: item.team_id, tournamentId: item.tournament_id, userId: item.user_id } });
            }
        }}>
            <Card.Content style={styles.cardContent}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Text variant="titleMedium">{item.type.replace('_', ' ')}</Text>
                        {item.type === 'TOURNAMENT_FEE' && (
                            <MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
                        )}
                    </View>
                    {item.user && <Text variant="bodyMedium">User: {item.user.name}</Text>}
                    {item.team && <Text variant="bodyMedium">Team: {item.team.name} {item.tournament ? `(${item.tournament.name})` : ''}</Text>}
                    <Text variant="bodySmall" style={{ color: theme.colors.primary }}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                    {item.notes && <Text variant="bodySmall" numberOfLines={1} style={{ color: 'gray' }}>{item.notes}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 0 }}>
                    <Text variant="titleMedium" style={{ color: 'green', fontWeight: 'bold', marginRight: 10 }}>₹{item.amount}</Text>
                    {AuthService.hasPermission(user, 'ledger', 'view') && <IconButton icon="history" size={20} iconColor="#607D8B" onPress={() => { setAuditEntityId(item.id); setAuditVisible(true); }} />}
                    {AuthService.hasPermission(user, 'ledger', 'edit') && <IconButton icon="pencil" size={20} iconColor="#1976d2" onPress={() => router.push({ pathname: '/management/add-payment', params: { editId: item.id, initialAmount: item.amount, initialNotes: item.notes, initialDate: item.date, initialType: item.type, initialMethod: item.payment_method, initialTxType: item.transaction_type, teamId: item.team_id, tournamentId: item.tournament_id, userId: item.user_id } })} />}
                    {AuthService.hasPermission(user, 'ledger', 'delete') && <IconButton icon="delete" size={20} iconColor="red" onPress={() => handleDelete(item.id)} />}
                </View>
            </Card.Content>
        </Card>
    );

    if (!AuthService.hasPermission(user, 'ledger', 'view')) {
        return (
            <View style={styles.centered}>
                <MaterialCommunityIcons name="shield-lock-outline" size={64} color="gray" />
                <Text variant="titleMedium" style={{ marginTop: 10, color: 'gray' }}>Access Denied</Text>
            </View>
        );
    }

    const types = ['PAYMENT', 'SUBSCRIPTION', 'DONATION', 'DEPOSIT', 'MAINTENANCE', 'TOURNAMENT_FEE'];

    return (
        <SafeAreaView style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Payments" titleStyle={{ color: 'white' }} />
                <Menu
                    visible={filterMenuVisible}
                    onDismiss={() => setFilterMenuVisible(false)}
                    anchor={<Appbar.Action icon={selectedType ? "filter" : "filter-outline"} color="white" onPress={() => setFilterMenuVisible(true)} />}
                >
                    <Menu.Item onPress={() => { setSelectedType(null); setFilterMenuVisible(false); }} title="All Types" leadingIcon={!selectedType ? "check" : undefined} />
                    {types.map((t) => (
                        <Menu.Item
                            key={t}
                            onPress={() => { setSelectedType(t); setFilterMenuVisible(false); }}
                            title={t.replace('_', ' ')}
                            leadingIcon={selectedType === t ? "check" : undefined}
                        />
                    ))}
                </Menu>
            </Appbar.Header>

            {selectedType && (
                <View style={{ padding: 10, paddingBottom: 0 }}>
                    <Chip onClose={() => setSelectedType(null)} icon="filter">{selectedType.replace('_', ' ')}</Chip>
                </View>
            )}

            {loading ? (
                <View style={styles.centered}><ActivityIndicator /></View>
            ) : (
                <FlatList
                    data={ledgers}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No payments found.</Text>}
                />
            )}

            {AuthService.hasPermission(user, 'ledger', 'add') && (
                <FAB
                    icon="plus"
                    style={styles.fab}
                    label="Receive Payment"
                    onPress={() => router.push('/management/add-payment')}
                />
            )}

            <AuditLogDialog
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="LEDGER"
                entityId={auditEntityId}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginBottom: 12, backgroundColor: 'white' },
    cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 }
});

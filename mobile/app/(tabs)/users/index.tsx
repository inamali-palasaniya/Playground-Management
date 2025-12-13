import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Searchbar, FAB, Avatar, Card, Chip, ActivityIndicator, useTheme } from 'react-native-paper';
import { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';

export default function UsersScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [fabOpen, setFabOpen] = useState(false);

    const loadUsers = useCallback(() => {
        setLoading(true);
        apiService.getUsers()
            .then(setUsers)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    useFocusEffect(loadUsers);

    const filteredUsers = users.filter((u: any) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery)
    );

    const renderItem = ({ item }: { item: any }) => (
        <Card
            style={[
                styles.card,
                {
                    borderLeftWidth: 5,
                    borderLeftColor: item.subscription_status === 'EXPIRED' ? 'red' :
                        (item.subscription_status === 'ACTIVE' && item.plan_name?.toLowerCase().includes('monthly')) ? 'green' : 'transparent'
                }
            ]}
            onPress={() => router.push({ pathname: '/management/user/[id]', params: { id: item.id } })}
        >
            <Card.Title
                title={item.name}
                subtitle={
                    <Text>
                        {item.role} • {item.phone}
                        {item.plan_name ? `\nPlan: ${item.plan_name}` : ''}
                        {item.balance !== undefined && item.balance > 0 && <Text style={{ color: 'red', fontWeight: 'bold' }}> • Payable: ₹{item.balance}</Text>}
                        {item.balance !== undefined && item.balance < 0 && <Text style={{ color: 'green', fontWeight: 'bold' }}> • Advance: ₹{Math.abs(item.balance)}</Text>}
                        {item.balance === 0 && <Text style={{ color: 'gray' }}> • Settled</Text>}
                    </Text>
                }
                subtitleNumberOfLines={4}
                left={(props) => <Avatar.Text {...props} label={item.name.substring(0, 2).toUpperCase()} />}
                right={(props) => (
                    <View style={{ marginRight: 16, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {/* Balance Pill for High Visibility */}
                        {item.balance !== undefined && item.balance !== 0 && (
                            <View style={{
                                backgroundColor: item.balance > 0 ? '#ffebee' : '#e8f5e9',
                                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
                                borderWidth: 1, borderColor: item.balance > 0 ? '#ef9a9a' : '#a5d6a7',
                                marginBottom: 4
                            }}>
                                <Text style={{ fontSize: 11, color: item.balance > 0 ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>
                                    {item.balance > 0 ? `Due: ₹${item.balance}` : `Adv: ₹${Math.abs(item.balance)}`}
                                </Text>
                            </View>
                        )}

                        {item.deposit_amount !== undefined && item.deposit_amount < 2000 && (
                            <View style={{ backgroundColor: '#f3e5f5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#ce93d8' }}>
                                <Text style={{ fontSize: 11, color: '#7b1fa2', fontWeight: 'bold' }}>Deposit: ₹{item.deposit_amount}</Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </Card>
    );

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search Users"
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />
            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}
            <FAB.Group
                open={fabOpen}
                visible
                icon={fabOpen ? 'close' : 'menu'}
                actions={[
                    { icon: 'account-plus', label: 'Add User', onPress: () => router.push('/management/add-user') },
                    { icon: 'database-cog', label: 'Manage Masters', onPress: () => router.push('/management/masters') },
                ]}
                onStateChange={({ open }) => setFabOpen(open)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    searchBar: { margin: 16, backgroundColor: 'white' },
    list: { paddingHorizontal: 16, paddingBottom: 80 },
    card: { marginBottom: 10, backgroundColor: 'white' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
});

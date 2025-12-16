import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Text, Searchbar, FAB, Avatar, Card, Chip, ActivityIndicator, useTheme, IconButton, Menu, Button } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface User {
    id: number;
    name: string;
    phone: string;
    email?: string;
    role: string;
    group?: { id: number; name: string };
    plan_name?: string;
    subscription_status?: string;
    punch_status?: 'IN' | 'OUT' | 'NONE';
    balance?: number;
    deposit_amount?: number;
}

interface Group {
    id: number;
    name: string;
}

export default function UsersScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await AuthService.getUser();
            setCurrentUser(user);

            if (user?.role === 'NORMAL') {
                // For normal users, we don't fetch the list.
                // We just show their own card or redirect.
                // Fetching self details to show up-to-date info
                const selfDetails = await apiService.request(`/api/users/${user.id}`);
                setUsers([selfDetails as User]);
            } else {
                // Management: Fetch all
                const usersPromise = apiService.request(`/api/users${selectedGroup ? `?group_id=${selectedGroup.id}` : ''}`);
                const groupsPromise = apiService.request('/api/groups');

                const [usersData, groupsData] = await Promise.all([usersPromise, groupsPromise]);

                setUsers(usersData as User[]);
                setGroups(groupsData as Group[]);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Reload when screen focuses or group filter changes
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedGroup])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handlePunch = async (user: User) => {
        try {
            if (user.punch_status === 'IN') {
                await apiService.checkOut(user.id);
            } else {
                await apiService.checkIn(user.id, new Date().toISOString());
            }
            // Refresh to show new status
            loadData();
        } catch (error: any) {
            console.error('Punch failed', error);
            let message = 'Failed to update attendance';
            if (error.body) {
                try {
                    const parsed = JSON.parse(error.body);
                    if (parsed.error) message = parsed.error;
                } catch (e) {
                    message = String(error.body);
                }
            }
            Alert.alert('Error', message);
        }
    };

    const confirmDelete = (id: number, name: string) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.deleteUser(id);
                            loadData();
                        } catch (error: any) {
                            console.warn('Delete error handled:', error.message || 'Unknown');
                            // Show specific message if available
                            const msg = error.message || error.error || 'Failed to delete user';
                            Alert.alert('Unable to Delete', msg);
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = users.filter((u: User) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery)
    );

    const renderItem = ({ item }: { item: User }) => (
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
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {item.role === 'SUPER_ADMIN' && <MaterialCommunityIcons name="shield-crown" size={16} color="gold" style={{ marginRight: 4 }} />}
                            <Text style={{ fontWeight: item.role === 'SUPER_ADMIN' ? 'bold' : 'normal', color: item.role === 'SUPER_ADMIN' ? '#d32f2f' : 'black' }}>
                                {item.role === 'SUPER_ADMIN' ? 'Super Admin' : item.role}
                            </Text>
                            <Text> • {item.group?.name || 'No Group'}</Text>
                        </View>

                        <View style={{ marginTop: 2 }}>
                            {item.email && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                                    <MaterialCommunityIcons name="email-outline" size={12} color="gray" style={{ marginRight: 4 }} />
                                    <Text variant="bodySmall" style={{ color: 'gray' }}>{item.email}</Text>
                                </View>
                            )}
                            {item.phone && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <MaterialCommunityIcons name="phone-outline" size={12} color="gray" style={{ marginRight: 4 }} />
                                    <Text variant="bodySmall" style={{ color: 'gray' }}>{item.phone}</Text>
                                </View>
                            )}
                        </View>

                        {item.plan_name ? <Text variant="bodySmall" style={{ color: '#555', marginTop: 2 }}>Plan: {item.plan_name}</Text> : null}
                        {item.deposit_amount !== undefined && item.deposit_amount > 0 ? <Text variant="bodySmall" style={{ color: '#555' }}>Deposit: ₹{item.deposit_amount}</Text> : ''}

                        {item.balance !== undefined && item.balance !== 0 && (
                            <Text style={{
                                fontWeight: 'bold',
                                color: item.balance > 0 ? 'red' : 'green',
                                marginTop: 2
                            }}>
                                • {item.balance > 0 ? `Payable: ₹${item.balance}` : `Advance: ₹${Math.abs(item.balance)}`}
                            </Text>
                        )}
                    </View>
                }
                subtitleNumberOfLines={4}
                left={(props) => <Avatar.Text {...props} label={item.name.substring(0, 2).toUpperCase()} />}
                right={(props) => (
                    <View style={{ marginRight: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {/* Only show actions for MANAGEMENT */}
                        {currentUser?.role !== 'NORMAL' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {/* 1. In/Out Icon */}
                                <IconButton
                                    icon={item.punch_status === 'IN' ? 'logout' : 'login'}
                                    mode="contained"
                                    containerColor={item.punch_status === 'IN' ? '#FF5252' : '#4CAF50'}
                                    iconColor="white"
                                    size={20}
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        handlePunch(item);
                                    }}
                                />
                                {/* 2. Edit Icon (Green) */}
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    iconColor="#4CAF50" // Green
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        router.push({ pathname: '/management/edit-user', params: { id: item.id } });
                                    }}
                                />
                                {/* 3. Delete Icon (Red) */}
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    iconColor="#F44336" // Red
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        confirmDelete(item.id, item.name);
                                    }}
                                />
                            </View>
                        )}
                        {item.balance !== undefined && item.balance !== 0 && (
                            <View style={{
                                backgroundColor: item.balance > 0 ? '#ffebee' : '#e8f5e9',
                                paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
                                borderWidth: 1, borderColor: item.balance > 0 ? '#ef9a9a' : '#a5d6a7',
                                marginTop: 8, marginRight: 10, alignSelf: 'flex-end', marginBottom: 12 
                            }}>
                                <Text style={{ fontSize: 10, color: item.balance > 0 ? '#c62828' : '#2e7d32', fontWeight: 'bold' }}>
                                    {item.balance > 0 ? `Due: ₹${item.balance}` : `Adv: ₹${Math.abs(item.balance)}`}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </Card>
    );

    const isManagement = currentUser?.role !== 'NORMAL';

    return (
        <View style={styles.container}>
            {isManagement ? (
                <View style={styles.headerContainer}>
                    <Searchbar
                        placeholder="Search Users"
                        onChangeText={setSearchQuery}
                        value={searchQuery}
                        style={styles.searchBar}
                    />
                    <View style={styles.filterRow}>
                        <Menu
                            visible={menuVisible}
                            onDismiss={() => setMenuVisible(false)}
                            anchor={
                                <Chip
                                    icon="filter-variant"
                                    onPress={() => setMenuVisible(true)}
                                    selected={!!selectedGroup}
                                    style={styles.filterChip}
                                >
                                    {selectedGroup?.name || "All Groups"}
                                </Chip>
                            }
                        >
                            <Menu.Item onPress={() => { setSelectedGroup(null); setMenuVisible(false); }} title="All Groups" />
                            {groups.map(g => (
                                <Menu.Item key={g.id} onPress={() => { setSelectedGroup(g); setMenuVisible(false); }} title={g.name} />
                            ))}
                        </Menu>
                    </View>
                </View>
            ) : (
                <View style={[styles.headerContainer, { alignItems: 'center' }]}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>My Profile</Text>
                </View>
            )}

            {loading && !refreshing ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                        data={isManagement ? filteredUsers : users} // If normal, users contains only self
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}

            {isManagement && (
                <FAB.Group
                    open={fabOpen}
                    visible
                    icon={fabOpen ? 'close' : 'plus'}
                    // In mobile/app/(tabs)/users/index.tsx (snippet)
                    actions={[
                        { icon: 'account-plus', label: 'Add User', onPress: () => router.push('/management/add-user') },
                        { icon: 'cash-minus', label: 'Expenses', onPress: () => router.push('/management/expenses') },
                        { icon: 'database-cog', label: 'Manage Masters', onPress: () => router.push('/management/masters') },
                    ]}
                    onStateChange={({ open }) => setFabOpen(open)}
                    style={{ paddingBottom: 80 }} // Ensure it's above the tab bar
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    headerContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    searchBar: { elevation: 0, backgroundColor: '#f5f5f5', borderRadius: 8 },
    filterRow: { flexDirection: 'row', marginTop: 12 },
    filterChip: { marginRight: 8 },
    list: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 10 },
    card: { marginBottom: 10, backgroundColor: 'white' },
});

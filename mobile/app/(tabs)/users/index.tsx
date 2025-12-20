import React, { useState, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, StyleSheet, FlatList, RefreshControl, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Searchbar, FAB, Avatar, Card, Chip, ActivityIndicator, useTheme, IconButton, Menu, Button, Portal } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import apiService from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AuditLogDialog from '../../components/AuditLogDialog';

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
    created_by_name?: string;
    createdAt?: string;
}

interface Group {
    id: number;
    name: string;
}

interface SubscriptionPlan {
    id: number;
    name: string;
}

export default function PeopleScreen() {
    const theme = useTheme();
    const router = useRouter();
    const isFocused = useIsFocused();
    const { user_type, punch_status, status, filter } = useLocalSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);

    // Filters State
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // 'ACTIVE', 'INACTIVE'
    const [selectedPunch, setSelectedPunch] = useState<string | null>(null); // 'IN', 'OUT'
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

    // Menus Visibility
    const [menuGroup, setMenuGroup] = useState(false);
    const [menuRole, setMenuRole] = useState(false);
    const [menuStatus, setMenuStatus] = useState(false);
    const [menuPunch, setMenuPunch] = useState(false);
    const [menuType, setMenuType] = useState(false);
    const [menuPlan, setMenuPlan] = useState(false);
    const [menuFinance, setMenuFinance] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

    // Params from dashboard
    const params = useLocalSearchParams();
    const [activeFilter, setActiveFilter] = useState<string | null>(null); // 'EXPIRED' (Legacy Dashboard Parm)

    // Audit Dialog State
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const user = await AuthService.getUser();
            setCurrentUser(user);

            if (!user) {
                setLoading(false);
                return;
            }

            if (user?.role === 'NORMAL') {
                // For normal users, we don't fetch the list.
                // We just show their own card or redirect.
                // Fetching self details to show up-to-date info
                const selfDetails = await apiService.request(`/api/users/${user.id}`);
                setUsers([selfDetails as User]);
            } else {
                // Management: Fetch all
                let queryString = `?dummy=1`;

                // Dashboard Helpers (Legacy & Deep Links)
                // Dashboard Helpers & Generic Filter
                if (activeFilter) queryString += `&filter=${activeFilter}`;

                // Main Filters
                if (selectedGroup) queryString += `&group_id=${selectedGroup.id}`;
                if (selectedRole) queryString += `&role=${selectedRole}`;
                if (selectedStatus) queryString += `&status=${selectedStatus}`; // 'ACTIVE' | 'INACTIVE'
                if (selectedPunch) queryString += `&punch_status=${selectedPunch}`; // 'IN' | 'OUT'
                if (selectedType) queryString += `&user_type=${selectedType}`;
                if (selectedPlan) queryString += `&plan_id=${selectedPlan.id}`;

                const usersPromise = apiService.request(`/api/users${queryString}`);
                const groupsPromise = apiService.request('/api/groups');
                const plansPromise = apiService.request('/api/subscription-plans');

                const [usersData, groupsData, plansData] = await Promise.all([usersPromise, groupsPromise, plansPromise]);

                console.log('API returned users:', (usersData as any[])?.length, 'Sample:', (usersData as any[])?.[0]);
                setUsers(usersData as User[]);
                setGroups(groupsData as Group[]);
                setPlans(plansData as SubscriptionPlan[]);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            console.log('Users loaded:', users.length, 'items');
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Reload when screen focuses or group filter changes
    useFocusEffect(
        useCallback(() => {
            // Sync Params to State if provided (Deep Linking)
            if (params.filter && params.filter !== activeFilter) setActiveFilter(params.filter as string);

            // Map legacy params to new state
            if (params.role && params.role !== selectedRole) setSelectedRole(params.role as string);
            if (params.status && params.status !== selectedStatus) setSelectedStatus(params.status as string);
            if (params.punch_status && params.punch_status !== selectedPunch) setSelectedPunch(params.punch_status as string);
            if (params.user_type && params.user_type !== selectedType) setSelectedType(params.user_type as string);

            loadData();
        }, [
            selectedGroup, selectedRole, selectedStatus, selectedPunch, selectedType, selectedPlan, activeFilter,
            params.filter, params.role, params.status, params.punch_status, params.user_type
        ])
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
            key={`user-${item.id}-${item.name}-${item.role}`}
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
                titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
                subtitle={
                    <Text style={{ fontSize: 12, color: '#555' }}>
                        <Text style={{ fontWeight: item.role === 'SUPER_ADMIN' ? 'bold' : 'normal', color: item.role === 'SUPER_ADMIN' ? '#d32f2f' : '#333' }}>
                            {item.role === 'SUPER_ADMIN' ? 'Super Admin' : item.role}
                        </Text>
                        <Text style={{ color: '#888' }}> • {item.group?.name || 'No Group'}</Text>
                    </Text>
                }
                subtitleStyle={{ marginTop: -2 }}
                left={(props) => <Avatar.Text {...props} size={40} label={item.name.substring(0, 2).toUpperCase()} />}
                right={(props) => (
                    <View style={{ marginRight: 8, alignItems: 'flex-end', justifyContent: 'center' }}>
                        {currentUser?.role !== 'NORMAL' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <IconButton
                                    icon={item.punch_status === 'IN' ? 'logout' : 'login'}
                                    mode="contained"
                                    containerColor={item.punch_status === 'IN' ? '#FF5252' : '#4CAF50'}
                                    iconColor="white"
                                    size={18}
                                    style={{ margin: 0, marginRight: 4 }}
                                    onPress={(e) => { e.stopPropagation(); handlePunch(item); }}
                                />
                                <IconButton
                                    icon="pencil"
                                    size={18}
                                    iconColor="#4CAF50"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/management/edit-user', params: { id: item.id } }); }}
                                />
                                <IconButton
                                    icon="delete"
                                    size={18}
                                    iconColor="#F44336"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); confirmDelete(item.id, item.name); }}
                                />
                                <IconButton
                                    icon="history"
                                    size={18}
                                    iconColor="#607D8B"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); setAuditEntityId(item.id); setAuditVisible(true); }}
                                />
                            </View>
                        )}
                    </View>
                )}
            />
            <Card.Content>
                <View style={{ paddingBottom: 4 }}>
                    {/* Contact Row: Email Left, Phone Right */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                            {item.email ? (
                                <>
                                    <MaterialCommunityIcons name="email-outline" size={14} color="gray" />
                                    <Text variant="bodySmall" numberOfLines={1} style={{ color: 'gray', marginLeft: 4, flex: 1 }}>{item.email}</Text>
                                </>
                            ) : null}
                        </View>
                        {item.phone && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <MaterialCommunityIcons name="phone-outline" size={14} color="gray" />
                                <Text variant="bodySmall" style={{ color: 'gray', marginLeft: 4 }}>{item.phone}</Text>
                            </View>
                        )}
                    </View>

                    {/* Financials & Plan Row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {item.plan_name && (
                            <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: '#555' }}>{item.plan_name}</Text>
                            </View>
                        )}
                        {item.balance !== undefined && item.balance !== 0 && (
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.balance > 0 ? '#d32f2f' : '#388e3c' }}>
                                {item.balance > 0 ? `Due: ₹${item.balance}` : `Adv: ₹${Math.abs(item.balance)}`}
                            </Text>
                        )}
                        {item.deposit_amount !== undefined && item.deposit_amount > 0 && (
                            <Text style={{ fontSize: 10, color: '#666' }}>Dep: ₹{item.deposit_amount}</Text>
                        )}
                    </View>

                    {/* Footer: Created By + Inactive Status */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#f0f0f0', paddingTop: 6 }}>
                        <Text style={{ fontSize: 10, color: '#999', fontStyle: 'italic' }}>
                            Added by {item.created_by_name || 'System'} • {item.createdAt ? format(new Date(item.createdAt), 'dd MMM') : ''}
                        </Text>
                        {(item as any).is_active === false && (
                            <View style={{ backgroundColor: '#ffebee', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                                <Text style={{ color: '#c62828', fontSize: 10, fontWeight: 'bold' }}>Inactive</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Card.Content>
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

                    {/* Horizontal Filter Bar */}
                    <View style={{ marginTop: 12 }}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterScroll}
                            keyboardShouldPersistTaps="always"
                        >

                            {/* Group Filter */}
                            <Menu
                                visible={menuGroup}
                                onDismiss={() => setMenuGroup(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="account-group"
                                        onPress={() => { if (!menuGroup) setMenuGroup(true); }}
                                        selected={!!selectedGroup}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedGroup?.name || "Group"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedGroup(null); setMenuGroup(false); }} title="All Groups" />
                                {groups.map(g => (
                                    <Menu.Item key={g.id} onPress={() => { setSelectedGroup(g); setMenuGroup(false); }} title={g.name} />
                                ))}
                            </Menu>

                            {/* Role Filter */}
                            <Menu
                                visible={menuRole}
                                onDismiss={() => setMenuRole(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="shield-account"
                                        onPress={() => { if (!menuRole) setMenuRole(true); }}
                                        selected={!!selectedRole}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedRole ? selectedRole.replace('_', ' ') : "Role"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedRole(null); setMenuRole(false); }} title="All Roles" />
                                {['MANAGEMENT', 'NORMAL', 'SUPER_ADMIN'].map(r => (
                                    <Menu.Item key={r} onPress={() => { setSelectedRole(r); setMenuRole(false); }} title={r.replace('_', ' ')} />
                                ))}
                            </Menu>

                            {/* Status Filter */}
                            <Menu
                                visible={menuStatus}
                                onDismiss={() => setMenuStatus(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="check-circle-outline"
                                        onPress={() => { if (!menuStatus) setMenuStatus(true); }}
                                        selected={!!selectedStatus}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedStatus ? selectedStatus : "Status"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedStatus(null); setMenuStatus(false); }} title="All Status" />
                                <Menu.Item onPress={() => { setSelectedStatus('ACTIVE'); setMenuStatus(false); }} title="Active" />
                                <Menu.Item onPress={() => { setSelectedStatus('INACTIVE'); setMenuStatus(false); }} title="Inactive" />
                            </Menu>

                            {/* Punch Filter */}
                            <Menu
                                visible={menuPunch}
                                onDismiss={() => setMenuPunch(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="clock-outline"
                                        onPress={() => { if (!menuPunch) setMenuPunch(true); }}
                                        selected={!!selectedPunch}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedPunch ? `Punch: ${selectedPunch}` : "Attendance"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedPunch(null); setMenuPunch(false); }} title="All" />
                                <Menu.Item onPress={() => { setSelectedPunch('IN'); setMenuPunch(false); }} title="IN" />
                                <Menu.Item onPress={() => { setSelectedPunch('OUT'); setMenuPunch(false); }} title="OUT" />
                            </Menu>

                            {/* Type Filter */}
                            <Menu
                                visible={menuType}
                                onDismiss={() => setMenuType(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="briefcase-outline"
                                        onPress={() => { if (!menuType) setMenuType(true); }}
                                        selected={!!selectedType}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedType?.replace('_', ' ') || "Type"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedType(null); setMenuType(false); }} title="All Types" />
                                {['NORMAL', 'STUDENT', 'SALARIED', 'NON_EARNING'].map(t => (
                                    <Menu.Item key={t} onPress={() => { setSelectedType(t); setMenuType(false); }} title={t.replace('_', ' ')} />
                                ))}
                            </Menu>

                            <Menu
                                visible={menuPlan}
                                onDismiss={() => setMenuPlan(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="tag-outline"
                                        onPress={() => { if (!menuPlan) setMenuPlan(true); }}
                                        selected={!!selectedPlan}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedPlan?.name || "Plan"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedPlan(null); setMenuPlan(false); }} title="All Plans" />
                                {plans.map(p => (
                                    <Menu.Item key={p.id} onPress={() => { setSelectedPlan(p); setMenuPlan(false); }} title={p.name} />
                                ))}
                            </Menu>

                            {/* Financial Filter */}
                            <Menu
                                visible={menuFinance}
                                onDismiss={() => setMenuFinance(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="cash"
                                        onPress={() => { if (!menuFinance) setMenuFinance(true); }}
                                        selected={!!activeFilter && (activeFilter === 'NEGATIVE_BALANCE' || activeFilter === 'SETTLED' || activeFilter === 'EXPIRED')}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {activeFilter === 'NEGATIVE_BALANCE' ? 'Due Only' :
                                            activeFilter === 'SETTLED' ? 'Settled' :
                                                activeFilter === 'EXPIRED' ? 'Expired' : 'Finance'}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setActiveFilter(null); setMenuFinance(false); }} title="All Financials" />
                                <Menu.Item onPress={() => { setActiveFilter('NEGATIVE_BALANCE'); setMenuFinance(false); }} title="Due Only" />
                                <Menu.Item onPress={() => { setActiveFilter('SETTLED'); setMenuFinance(false); }} title="Settled / Paid" />
                                <Menu.Item onPress={() => { setActiveFilter('EXPIRED'); setMenuFinance(false); }} title="Expired Plan" />
                            </Menu>

                            {/* Legacy "Expired" Chip (if triggered from Dashboard) -> Now handled in Finance Menu, but keeping optional visual indicator or removing if redundant */}
                            {/* Removing redundant chip as it's now in Finance Menu */}

                        </ScrollView>
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
                    extraData={users}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}

            {isManagement && (
                <Portal>
                    <FAB.Group
                        open={fabOpen}
                        visible={isFocused}
                        icon={fabOpen ? 'close' : 'plus'}
                        actions={[
                            ...(AuthService.hasPermission(currentUser, 'user', 'add') ? [{ icon: 'account-plus', label: 'Add User', onPress: () => router.push('/management/add-user') }] : []),
                            ...(AuthService.hasPermission(currentUser, 'expense', 'view') ? [{ icon: 'cash-minus', label: 'Expenses', onPress: () => router.push('/management/expenses') }] : []),
                            ...((AuthService.hasPermission(currentUser, 'master_groups', 'view') || AuthService.hasPermission(currentUser, 'master_plans', 'view') || AuthService.hasPermission(currentUser, 'master_fines', 'view'))
                                ? [{ icon: 'database-cog', label: 'Manage Masters', onPress: () => router.push('/management/masters') }] : []),
                        ]}
                        onStateChange={({ open }) => setFabOpen(open)}
                        style={{ paddingBottom: 60 }} // Adjusted padding for Portal
                    />
                </Portal>
            )}

            <AuditLogDialog
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="USER"
                entityId={auditEntityId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    headerContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    searchBar: { elevation: 0, backgroundColor: '#f5f5f5', borderRadius: 8 },
    filterScroll: { paddingRight: 16 },
    filterChip: { marginRight: 8, height: 32 },
    list: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 10 },
    card: { marginBottom: 10, backgroundColor: 'white' },
});

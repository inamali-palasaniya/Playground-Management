import React, { useState, useCallback, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, StyleSheet, FlatList, RefreshControl, Alert, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Text, Searchbar, FAB, Avatar, Card, Chip, ActivityIndicator, useTheme, IconButton, Menu, Button, Portal, Dialog, Switch, RadioButton, TextInput } from 'react-native-paper';
import { useRouter, useFocusEffect, useLocalSearchParams, Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import * as DocumentPicker from 'expo-document-picker';
import { documentDirectory, downloadAsync, uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../../constants/api';
import apiService from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuditLogs } from '../../../components/AuditLogs';
import { ErrorDialog } from '../../../components/ErrorDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeFormatDate } from '../../../utils/date.utils';

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
    payment_frequency?: 'DAILY' | 'MONTHLY' | null;
    plan_rate?: number;
    is_subscription_paid?: boolean;
    is_paid_today?: boolean;
    donation_debit?: number;
    donation_credit?: number;
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
    const insets = useSafeAreaInsets();
    const { user_type, punch_status, status, filter } = useLocalSearchParams();
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fabOpen, setFabOpen] = useState(false);
    const [exportMenuVisible, setExportMenuVisible] = useState(false);

    const getToken = async () => {
        return Platform.OS === 'web' ? await AsyncStorage.getItem('user_token') : await SecureStore.getItemAsync('user_token');
    };

    const handleExportUsers = async () => {
        setExportMenuVisible(false);
        try {
            setLoading(true);
            const token = await getToken();
            const fileUri = documentDirectory + 'users_export.xlsx';
            
            const downloadRes = await downloadAsync(
                `${API_BASE_URL}/api/users/export`,
                fileUri,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (downloadRes.status !== 200) {
                throw new Error('Download failed from server');
            }

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exported Users' });
            } else {
                Alert.alert('Success', 'File exported successfully but sharing is not available.');
            }
        } catch (error: any) {
            console.error('Export Error:', error);
            Alert.alert('Export Failed', 'Unable to export users.');
        } finally {
            setLoading(false);
        }
    };

    const handleImportUsers = async () => {
        setExportMenuVisible(false);
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', '*/*'],
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) return;

            setLoading(true);
            const file = result.assets[0];
            const token = await getToken();

            const uploadRes = await uploadAsync(
                `${API_BASE_URL}/api/users/import`,
                file.uri,
                {
                    httpMethod: 'POST',
                    uploadType: FileSystemUploadType.MULTIPART,
                    fieldName: 'file',
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (uploadRes.status === 200) {
                const resBody = JSON.parse(uploadRes.body);
                Alert.alert('Import Success', `Imported successfully.\nCreated: ${resBody.created}\nUpdated: ${resBody.updated}`);
                loadData();
            } else {
                const errorBody = JSON.parse(uploadRes.body);
                throw new Error(errorBody.error || 'Server error');
            }
        } catch (error: any) {
            console.error('Import Error:', error);
            Alert.alert('Import Failed', error.message || 'Unable to import users.');
        } finally {
            setLoading(false);
        }
    };

    // Filters State
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // 'ACTIVE', 'INACTIVE'
    const [selectedPunch, setSelectedPunch] = useState<string | null>(null); // 'IN', 'OUT'
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
    const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);
    const [selectedFrequency, setSelectedFrequency] = useState<string | null>(null); // 'DAILY', 'MONTHLY'
    const [selectedDonationStatus, setSelectedDonationStatus] = useState<string | null>(null);

    // Menus Visibility
    const [menuGroup, setMenuGroup] = useState(false);
    const [menuRole, setMenuRole] = useState(false);
    const [menuStatus, setMenuStatus] = useState(false);
    const [menuPunch, setMenuPunch] = useState(false);
    const [menuType, setMenuType] = useState(false);
    const [menuPlan, setMenuPlan] = useState(false);
    const [menuFrequency, setMenuFrequency] = useState(false);
    const [menuFinance, setMenuFinance] = useState(false);
    const [menuDonation, setMenuDonation] = useState(false);

    const [currentUser, setCurrentUser] = useState<any>(null);

    // Params from dashboard
    const params = useLocalSearchParams();
    const [activeFilter, setActiveFilter] = useState<string | null>(null); // 'EXPIRED' (Legacy Dashboard Parm)

    // Audit Dialog State
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);

    // Punch Modal State
    const [punchModalVisible, setPunchModalVisible] = useState(false);
    const [punchTargetUser, setPunchTargetUser] = useState<User | null>(null);
    const [bookFeeDebit, setBookFeeDebit] = useState(true);
    const [markFeePaid, setMarkFeePaid] = useState(false);
    const [checkInAmount, setCheckInAmount] = useState('');
    const [punchTransactionType, setPunchTransactionType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');

    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Race Condition Fix: Track the latest request ID
    const lastRequestId = React.useRef(0);

    const loadData = async () => {
        try {
            // Increment ID for this new request
            const currentRequestId = lastRequestId.current + 1;
            lastRequestId.current = currentRequestId;

            setLoading(true);
            const user = await AuthService.getUser();
            setCurrentUser(user);

            if (!user) {
                setLoading(false);
                return;
            }

            if (!AuthService.hasPermission(user, 'user', 'view')) {
                setLoading(false);
                return;
            }

            let queryString = `?dummy=1`;
                if (activeFilter) queryString += `&filter=${activeFilter}`;
                if (selectedGroup) queryString += `&group_id=${selectedGroup.id}`;
                if (selectedRole) queryString += `&role=${selectedRole}`;
                if (selectedStatus) queryString += `&status=${selectedStatus}`;
                if (selectedPunch) queryString += `&punch_status=${selectedPunch}`;
                if (selectedType) queryString += `&user_type=${selectedType}`;
                if (selectedPlanName) queryString += `&plan_name=${encodeURIComponent(selectedPlanName)}`;
                if (selectedFrequency) queryString += `&payment_frequency=${selectedFrequency}`;
                if (selectedDonationStatus) queryString += `&donationStatus=${selectedDonationStatus}`;

                const usersPromise = apiService.request(`/api/users${queryString}`, { skipLoader: true });
                const promises: Promise<any>[] = [usersPromise];

                const needsGroups = groups.length === 0;
                const needsPlans = plans.length === 0;

                if (needsGroups) promises.push(apiService.request('/api/groups', { skipLoader: true }));
                if (needsPlans) promises.push(apiService.request('/api/subscription-plans', { skipLoader: true }));

                const results = await Promise.all(promises);

                // CRITICAL: Check if a newer request has started since we began
                if (lastRequestId.current !== currentRequestId) {
                    console.log(`Ignoring stale request ${currentRequestId} (latest: ${lastRequestId.current})`);
                    return;
                }

                // Robust result handling: Mapping results back to their purpose
                let resultIdx = 0;
                const usersData = results[resultIdx++];
                
                if (needsGroups) {
                    const groupsData = results[resultIdx++];
                    if (Array.isArray(groupsData)) setGroups(groupsData);
                }
                
                if (needsPlans) {
                    const plansData = results[resultIdx++];
                    if (Array.isArray(plansData)) {
                        setPlans(plansData);
                        console.log('API returned plans:', plansData.length);
                    }
                }

                if (Array.isArray(usersData)) {
                    console.log('API returned users:', usersData.length);
                    setUsers(usersData as User[]);
                } else {
                    console.error('API returned non-array users data:', usersData);
                    setUsers([]);
                }
        } catch (error: any) {
            if (error.status === 403) {
                setErrorMessage(error.message || 'Access Denied');
                setErrorVisible(true);
            } else if (error.status !== 401) {
                console.error('Failed to load data:', error);
                setErrorMessage(typeof error.message === 'string' ? error.message : 'Failed to load user list');
                setErrorVisible(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Flag to track if params were synced once on focus
    const [paramsSynced, setParamsSynced] = useState(false);

    useFocusEffect(
        useCallback(() => {
            if (!paramsSynced) {
                // Sync Params to State only once per focus to avoid circular re-app
                if (params.filter) setActiveFilter(params.filter as string);
                if (params.role) setSelectedRole(params.role as string);
                if (params.status) setSelectedStatus(params.status as string);
                if (params.punch_status) setSelectedPunch(params.punch_status as string);
                if (params.user_type) setSelectedType(params.user_type as string);
                setParamsSynced(true);
            }
            loadData();

            return () => {
                // We DON'T reset paramsSynced here if we want sticky filters while switching tabs,
                // but if we want "Dashboard -> UserList" to ALWAYS apply new filters, we should reset it
                // when we LEAVE the screen or when the params themselves change.
            };
        }, [
            selectedGroup, selectedRole, selectedStatus, selectedPunch, selectedType, selectedPlan, selectedPlanName, selectedFrequency, selectedDonationStatus, activeFilter,
            paramsSynced // Load data whenever filters or sync status change
        ])
    );

    // Reset sync flag when params change externally (e.g. user clicks another dashboard count)
    useEffect(() => {
        setParamsSynced(false);
    }, [params.role, params.status, params.punch_status, params.user_type, params.filter]);

    const handleLogout = async () => {
        await AuthService.logout();
        router.replace('/login');
    };

    const checkUpdates = async () => {
        try {
            if (__DEV__) {
                Alert.alert('Dev Mode', 'OTA updates are disabled in development.');
                return;
            }
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                Alert.alert('Update Available', 'Downloading...', [{ text: 'OK' }]);
                await Updates.fetchUpdateAsync();
                Alert.alert('Update Ready', 'Restarting app...', [
                    { text: 'OK', onPress: () => Updates.reloadAsync() }
                ]);
            } else {
                Alert.alert('Up to Date', 'You have the latest version.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handlePunchClick = (item: User) => {
        if (item.punch_status === 'IN') {
             // If already IN, just Punch OUT silently (no fee logic needed for OUT usually)
             handlePunchConfirm(item, false, false);
        } else {
             // User is OUT, open Punch IN Modal to handle Fast-Track billing
             setPunchTargetUser(item);
             
             const isDaily = item.payment_frequency === 'DAILY';
             const isMonthly = item.payment_frequency === 'MONTHLY';
             const isFirstOfMonth = new Date().getDate() === 1;

             setCheckInAmount(item.plan_rate ? item.plan_rate.toString() : '');
             setPunchTransactionType('DEBIT');

             if (isMonthly) {
                if (item.is_subscription_paid) {
                    setBookFeeDebit(false);
                    setMarkFeePaid(false); // Already paid this month
                } else {
                    setBookFeeDebit(true);
                    setMarkFeePaid(true); // Default to ON for monthly if not paid
                }
             } else if (item.is_paid_today) {
                setBookFeeDebit(false);
                setMarkFeePaid(false); // Already paid today
             } else if (isDaily) {
                setBookFeeDebit(true);
                setMarkFeePaid(true); // Default to ON for Daily if not paid today
             } else {
                setBookFeeDebit(true);
                setMarkFeePaid(false);
             }

             setPunchModalVisible(true);
        }
    };

    const handlePunchConfirm = async (user: User, debit: boolean, credit: boolean) => {
        setPunchModalVisible(false);
        const previousStatus = user.punch_status;
        const newStatus = previousStatus === 'IN' ? 'OUT' : 'IN';
        
        // Optimistic UI Update
        setUsers(users.map(u => u.id === user.id ? { ...u, punch_status: newStatus } : u));

        try {
            if (previousStatus === 'IN') {
                await apiService.checkOut(user.id);
            } else {
                await apiService.checkIn(
                     user.id, 
                     new Date().toISOString(), 
                     debit, 
                     credit, 
                     user.payment_frequency === 'MONTHLY'
                );
            }
        } catch (error: any) {
            console.error('Punch failed', error);
            // Revert optimistic update on failure
            setUsers(users.map(u => u.id === user.id ? { ...u, punch_status: previousStatus } : u));
            
            let message = 'Failed to update attendance';
            
            // Graceful error stringification to prevent black debug crash
            if (error && error.status === 409) {
                message = 'User has already been checked in for this date.';
            } else if (error && error.body) {
                if (typeof error.body === 'string') {
                    try {
                        const parsed = JSON.parse(error.body);
                        if (parsed.error) message = parsed.error;
                    } catch (e) {
                         message = error.body;
                    }
                } else if (error.body.error) {
                    message = error.body.error;
                }
            } else if (error && error.message) {
                message = error.message;
            }
            
            Alert.alert('Attendance Error', message);
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
        String(u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.phone || '').includes(searchQuery)
    );

    const renderItem = ({ item }: { item: User }) => {
        if (!item || !item.id) return null;
        try {
            return (
        <Card
            key={`user-${item.id}-${item.name}-${item.role}`}
            style={[
                styles.card,
                {
                    borderLeftWidth: 5,
                    borderLeftColor: String(item.subscription_status) === 'EXPIRED' ? 'red' :
                        (String(item.subscription_status) === 'ACTIVE' && String(item.plan_name || '').toLowerCase().includes('monthly')) ? 'green' : 'transparent'
                }
            ]}
            onPress={() => router.push({ pathname: '/management/user/[id]', params: { id: item.id } })}
        >
            <Card.Title
                title={item.name || 'Unknown User'}
                titleStyle={{ fontSize: 16, fontWeight: 'bold' }}
                subtitle={
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons 
                             name="circle" 
                             size={10} 
                             color={item.punch_status === 'IN' ? '#4CAF50' : '#F44336'} 
                             style={{ marginRight: 6 }} 
                        />
                        <Text style={{ fontSize: 12, color: '#555' }}>
                            <Text style={{ fontWeight: item.role === 'SUPER_ADMIN' ? 'bold' : 'normal', color: item.role === 'SUPER_ADMIN' ? '#d32f2f' : '#333' }}>
                                {String(item.role) === 'SUPER_ADMIN' ? 'Super Admin' : String(item.role || 'Unknown')}
                            </Text>
                            <Text style={{ color: '#888' }}> • {item.group?.name || 'No Group'}</Text>
                        </Text>
                    </View>
                }
                subtitleStyle={{ marginTop: -2 }}
                left={(props) => <Avatar.Text {...props} size={40} label={String(item.name || 'U').substring(0, 2).toUpperCase()} style={{ backgroundColor: '#e3f2fd' }} color="#1565c0" />}
                right={(props) => {
                    const canEdit = AuthService.hasPermission(currentUser, 'user', 'edit');
                    const canDelete = AuthService.hasPermission(currentUser, 'user', 'delete');
                    const canPunch = AuthService.hasPermission(currentUser, 'attendance', 'add');
                    const canAudit = AuthService.hasPermission(currentUser, 'audit', 'view');

                    return (
                        <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center' }}>
                            {canPunch && (
                                <IconButton
                                    icon={item.punch_status === 'IN' ? 'logout' : 'login'}
                                    mode="contained"
                                    containerColor={item.punch_status === 'IN' ? '#FF5252' : '#2196F3'}
                                    iconColor="white"
                                    size={18}
                                    style={{ margin: 0, marginRight: 4 }}
                                    onPress={(e) => { e.stopPropagation(); handlePunchClick(item); }}
                                />
                            )}
                            {canEdit && (
                                <IconButton
                                    icon="pencil"
                                    size={18}
                                    iconColor="#4CAF50"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); router.push({ pathname: '/management/edit-user', params: { id: item.id } }); }}
                                />
                            )}
                            {canDelete && (
                                <IconButton
                                    icon="delete"
                                    size={18}
                                    iconColor="#F44336"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); confirmDelete(item.id, item.name); }}
                                />
                            )}
                            {canAudit && (
                                <IconButton
                                    icon="history"
                                    size={18}
                                    iconColor="#607D8B"
                                    style={{ margin: 0 }}
                                    onPress={(e) => { e.stopPropagation(); setAuditEntityId(item.id); setAuditVisible(true); }}
                                />
                            )}
                        </View>
                    );
                }}
            />
            <Card.Content>
                {/* Contact Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        {item.email ? (
                            <>
                                <MaterialCommunityIcons name="email-outline" size={14} color="gray" />
                                <Text variant="bodySmall" numberOfLines={1} style={{ color: 'gray', marginLeft: 4, flex: 1 }}>{item.email}</Text>
                            </>
                        ) : null}
                    </View>
                    {!!item.phone && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="phone-outline" size={14} color="gray" />
                            <Text variant="bodySmall" style={{ color: 'gray', marginLeft: 4 }}>{item.phone}</Text>
                        </View>
                    )}
                </View>

                {/* Financials & Plan Row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <MaterialCommunityIcons name="tag" size={12} color="#1565c0" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 10, color: '#1565c0', fontWeight: 'bold' }}>{item.plan_name || 'No Plan'}</Text>
                    </View>
                    {!!item.payment_frequency && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: item.payment_frequency === 'MONTHLY' ? '#e0f2f1' : '#fff3e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: item.payment_frequency === 'MONTHLY' ? '#00695c' : '#e65100', fontWeight: 'bold' }}>
                                {item.payment_frequency}
                            </Text>
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

                {/* Donation Summary (Compact) */}
                {((item.donation_debit || 0) > 0 || (item.donation_credit || 0) > 0) && (
                    <View style={{ marginTop: 2, padding: 6, backgroundColor: '#fdfdfd', borderRadius: 6, borderWidth: 0.5, borderColor: '#eee', flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="hand-heart" size={14} color="#2e7d32" style={{ marginRight: 8 }} />
                        <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 10, color: '#1976D2' }}>Cmt: <Text style={{ fontWeight: 'bold' }}>₹{item.donation_debit || 0}</Text></Text>
                            <Text style={{ fontSize: 10, color: '#2E7D32' }}>Paid: <Text style={{ fontWeight: 'bold' }}>₹{item.donation_credit || 0}</Text></Text>
                            <Text style={{ fontSize: 10, color: ((item.donation_debit || 0) - (item.donation_credit || 0)) > 0 ? '#D32F2F' : '#666' }}>Due: <Text style={{ fontWeight: 'bold' }}>₹{Math.max(0, (item.donation_debit || 0) - (item.donation_credit || 0))}</Text></Text>
                        </View>
                    </View>
                )}
            </Card.Content>
        </Card>
            );
        } catch (e) {
            console.error('Error rendering user item', e);
            return null;
        }
    };

    const canViewUsers = AuthService.hasPermission(currentUser, 'user', 'view');

    if (currentUser && !canViewUsers) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="shield-lock-outline" size={64} color="gray" />
                <Text variant="titleMedium" style={{ marginTop: 10, color: 'gray' }}>Access Denied</Text>
                <Text variant="bodyMedium" style={{ color: 'gray', textAlign: 'center', marginHorizontal: 30, marginTop: 5 }}>
                    You do not have permission to view the User Directory. Contact your administrator.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Searchbar
                        placeholder="Search Users"
                            onChangeText={setSearchQuery}
                            value={searchQuery}
                            style={[styles.searchBar, { flex: 1, marginRight: 8 }]}
                        />
                        {canViewUsers && (currentUser?.role === 'MANAGEMENT' || currentUser?.role === 'SUPER_ADMIN') && (
                            <Menu
                                visible={exportMenuVisible}
                                onDismiss={() => setExportMenuVisible(false)}
                                anchor={
                                    <IconButton
                                        icon="file-excel"
                                        mode="contained"
                                        containerColor="#e8f5e9"
                                        iconColor="#2e7d32"
                                        size={24}
                                        onPress={() => setExportMenuVisible(true)}
                                    />
                                }
                            >
                                <Menu.Item leadingIcon="download" onPress={handleExportUsers} title="Export Users" />
                                <Menu.Item leadingIcon="upload" onPress={handleImportUsers} title="Import Users" />
                            </Menu>
                        )}
                        <IconButton
                            icon="cloud-download-outline"
                            mode="contained"
                            containerColor="#e3f2fd"
                            iconColor="#1565c0"
                            size={24}
                            onPress={checkUpdates}
                        />
                    </View>

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
                                        onPress={() => setMenuGroup(true)}
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
                                    <Menu.Item key={g.id} onPress={() => { setSelectedGroup(g); setMenuGroup(false); }} title={g.name || 'Unknown Group'} />
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
                                        onPress={() => setMenuRole(true)}
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
                                        onPress={() => setMenuStatus(true)}
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
                                        onPress={() => setMenuPunch(true)}
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
                                        onPress={() => setMenuType(true)}
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
                                        onPress={() => setMenuPlan(true)}
                                        selected={!!selectedPlanName}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedPlanName || "Plan"}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedPlanName(null); setMenuPlan(false); }} title="All Plans" />
                                {Array.from(new Set(plans.map(p => {
                                    // Strip "Monthly", "Daily", "Monthly ", "Daily " (case insensitive)
                                    return p.name?.replace(/(Monthly|Daily)\s*/i, '').trim() || p.name;
                                }))).filter(Boolean).map(name => (
                                    <Menu.Item key={name} onPress={() => { setSelectedPlanName(name); setMenuPlan(false); }} title={name} />
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
                                        onPress={() => setMenuFinance(true)}
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

                            {/* Frequency Filter */}
                            <Menu
                                visible={menuFrequency}
                                onDismiss={() => setMenuFrequency(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="calendar-clock"
                                        onPress={() => setMenuFrequency(true)}
                                        selected={!!selectedFrequency}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedFrequency === 'DAILY' ? 'Daily' : selectedFrequency === 'MONTHLY' ? 'Monthly' : 'Frequency'}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedFrequency(null); setMenuFrequency(false); }} title="All Frequencies" />
                                <Menu.Item onPress={() => { setSelectedFrequency('DAILY'); setMenuFrequency(false); }} title="Daily" />
                                <Menu.Item onPress={() => { setSelectedFrequency('MONTHLY'); setMenuFrequency(false); }} title="Monthly" />
                            </Menu>

                            {/* Donation Status Filter */}
                            <Menu
                                visible={menuDonation}
                                onDismiss={() => setMenuDonation(false)}
                                anchor={
                                    <Chip
                                        mode="outlined"
                                        icon="hand-heart"
                                        onPress={() => setMenuDonation(true)}
                                        selected={!!selectedDonationStatus}
                                        style={styles.filterChip}
                                        showSelectedOverlay
                                    >
                                        {selectedDonationStatus === 'DONOR' ? 'All Donors' :
                                            selectedDonationStatus === 'PENDING' ? 'Pending' :
                                                    selectedDonationStatus === 'PAID' ? 'Fully Paid' : 'Donation'}
                                    </Chip>
                                }
                            >
                                <Menu.Item onPress={() => { setSelectedDonationStatus(null); setMenuDonation(false); }} title="All Users" />
                                <Menu.Item onPress={() => { setSelectedDonationStatus('DONOR'); setMenuDonation(false); }} title="All Donors" />
                                <Menu.Item onPress={() => { setSelectedDonationStatus('PENDING'); setMenuDonation(false); }} title="Pending/Partial" />
                                <Menu.Item onPress={() => { setSelectedDonationStatus('PAID'); setMenuDonation(false); }} title="Fully Paid" />
                            </Menu>
                        </ScrollView>
                    </View>
                </View>

            {loading && !refreshing ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredUsers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    extraData={users}
                    contentContainerStyle={styles.list}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={true}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            )}

            {canViewUsers && isFocused && (
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
                        style={{ paddingBottom: Platform.OS === 'ios' ? 90 : 70 }} // Adjusted for relative bar
                    />
                </Portal>
            )}

            <Portal>
                <Dialog visible={punchModalVisible} onDismiss={() => setPunchModalVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Punch IN - {punchTargetUser?.name || 'User'}</Dialog.Title>
                    <Dialog.Content>
                        {punchTargetUser?.payment_frequency ? (
                            <View>
                                <Text style={{ marginBottom: 12, color: 'gray' }}>
                                    Record {String(punchTargetUser.payment_frequency).toLowerCase()} billing for this check-in.
                                </Text>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <View>
                                        <Text variant="titleMedium">Record Bill/Payment</Text>
                                        <Text variant="bodySmall" style={{ color: 'gray' }}>Toggle off to only check-in</Text>
                                    </View>
                                    <Switch 
                                        value={bookFeeDebit} 
                                        onValueChange={(val) => {
                                            setBookFeeDebit(val);
                                            if(!val) setMarkFeePaid(false);
                                        }} 
                                    />
                                </View>

                                {bookFeeDebit && (
                                    <View style={{ marginTop: 10 }}>
                                        <Text variant="labelLarge" style={{ marginBottom: 8 }}>Type</Text>
                                        <RadioButton.Group 
                                            onValueChange={value => {
                                                setPunchTransactionType(value as any);
                                                setMarkFeePaid(value === 'CREDIT');
                                            }} 
                                            value={punchTransactionType}
                                        >
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center' }} 
                                                    onPress={() => { setPunchTransactionType('DEBIT'); setMarkFeePaid(false); }}
                                                >
                                                    <RadioButton value="DEBIT" />
                                                    <Text>Debit (Charge)</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={{ flexDirection: 'row', alignItems: 'center' }}
                                                    onPress={() => { setPunchTransactionType('CREDIT'); setMarkFeePaid(true); }}
                                                >
                                                    <RadioButton value="CREDIT" />
                                                    <Text>Credit (Paid)</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </RadioButton.Group>

                                        <TextInput
                                            label="Amount"
                                            value={checkInAmount}
                                            onChangeText={setCheckInAmount}
                                            keyboardType="numeric"
                                            mode="outlined"
                                            style={{ marginTop: 15, backgroundColor: 'white' }}
                                        />
                                    </View>
                                )}
                            </View>
                        ) : (
                            <Text>Punching in user with no configured frequency.</Text>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setPunchModalVisible(false)} textColor="gray">Cancel</Button>
                        <Button onPress={() => { if(punchTargetUser) handlePunchConfirm(punchTargetUser, bookFeeDebit, markFeePaid); }} mode="contained">Confirm Punch IN</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <AuditLogs 
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="USER"
                entityId={auditEntityId}
                title="User History"
            />

            <ErrorDialog
                visible={errorVisible}
                message={errorMessage}
                onDismiss={() => setErrorVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    headerContainer: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
    searchBar: { elevation: 0, backgroundColor: '#f5f5f5', borderRadius: 8 },
    filterScroll: { paddingRight: 16 },
    filterChip: { marginRight: 8, height: 32 },
    list: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 10 },
    card: { marginBottom: 10, backgroundColor: 'white' },
});

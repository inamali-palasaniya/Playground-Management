import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Searchbar, Chip, Avatar, Card, FAB, ActivityIndicator, useTheme, Button, Menu } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface User {
    id: number;
    name: string;
    phone: string;
    role: string;
    group?: { id: number; name: string };
}

interface Group {
    id: number;
    name: string;
}

export default function ProManagementDashboard() {
    const theme = useTheme();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, groupsData] = await Promise.all([
                apiService.request(`/api/users${selectedGroup ? `?group_id=${selectedGroup.id}` : ''}`),
                apiService.request('/api/groups')
            ]);
            setUsers(usersData as User[]);
            setGroups(groupsData as Group[]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [selectedGroup])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
    );

    return (
        <View style={styles.container}>
            {/* Header & Filters */}
            <View style={styles.headerContainer}>
                <Searchbar
                    placeholder="Search Members..."
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

            {/* User List */}
            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator style={{ marginTop: 20 }} />
                ) : (
                        filteredUsers.map(user => (
                            <Card
                                key={user.id}
                                style={styles.userCard}
                                onPress={() => router.push(`/management/user/${user.id}`)}
                            >
                                <Card.Title
                                    title={user.name}
                                    subtitle={`${user.role} • ${user.group?.name || 'No Group'}`}
                                    left={(props) => <Avatar.Text {...props} label={user.name.substring(0, 2).toUpperCase()} />}
                                    right={(props) => <MaterialCommunityIcons {...props} name="chevron-right" size={24} color="#ccc" style={{ marginRight: 16 }} />}
                                />
                            </Card>
                        ))
                )}
            </ScrollView>

            {/* Quick Actions FAB */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/management/add-user')}
                label="Add User"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    headerContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    searchBar: {
        elevation: 0,
        backgroundColor: '#f3f4f6',
        borderRadius: 8,
    },
    filterRow: {
        flexDirection: 'row',
        marginTop: 12,
    },
    filterChip: {
        marginRight: 8,
    },
    listContent: {
        padding: 16,
        paddingBottom: 80,
    },
    userCard: {
        marginBottom: 12,
        backgroundColor: 'white',
        borderRadius: 12,
        elevation: 1,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

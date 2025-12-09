import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Searchbar, Avatar, FAB, useTheme, Card, Chip } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import apiService from '../../../services/api.service';

export default function UsersScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadUsers = async () => {
        try {
            const data = await apiService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadUsers();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadUsers();
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
    );

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity onPress={() => router.push(`/users/${item.id}`)}>
            <Card style={styles.card}>
                <Card.Content style={styles.cardContent}>
                    <Avatar.Text size={50} label={item.name.substring(0, 2).toUpperCase()} style={{ backgroundColor: theme.colors.primaryContainer }} />
                    <View style={styles.userInfo}>
                        <Text variant="titleMedium" style={styles.userName}>{item.name}</Text>
                        <Text variant="bodySmall" style={styles.userPhone}>{item.phone}</Text>
                    </View>
                    <Chip compact textStyle={{ fontSize: 10 }}>{item.role}</Chip>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder="Search users..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
            />
            <FlatList
                data={filteredUsers}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                color="white"
                onPress={() => router.push('/management/add-user')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    searchBar: { margin: 16, elevation: 2 },
    listContent: { paddingHorizontal: 16, paddingBottom: 80 },
    card: { marginBottom: 12, backgroundColor: 'white' },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { fontWeight: 'bold' },
    userPhone: { color: '#666' },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
});

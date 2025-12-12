import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { List, FAB, ActivityIndicator, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function UserList() {
    const router = useRouter();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchUsers = async () => {
        try {
            const data = await apiService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            Alert.alert('Error', 'Failed to load users. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
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
                            fetchUsers(); // Refresh list
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={users}
                keyExtractor={(item) => item.id.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                renderItem={({ item }) => (
                    <List.Item
                        title={item.name}
                        description={`${item.role} • ${item.phone}`}
                        left={(props) => <List.Icon {...props} icon="account" />}
                        right={(props) => (
                            <View style={{ flexDirection: 'row' }}>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    onPress={() => router.push({ pathname: '/management/edit-user', params: { id: item.id } })}
                                />
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    onPress={() => confirmDelete(item.id, item.name)}
                                />
                            </View>
                        )}
                        style={styles.listItem}
                    />
                )}
            />
            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/management/add-user')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listItem: {
        backgroundColor: 'white',
        marginBottom: 4,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#6200ee',
    },
});

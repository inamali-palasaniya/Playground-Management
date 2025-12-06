import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { List, FAB, ActivityIndicator } from 'react-native-paper';
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

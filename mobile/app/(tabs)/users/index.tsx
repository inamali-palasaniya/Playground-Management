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
        <Card style={styles.card} onPress={() => router.push({ pathname: '/management/user/[id]', params: { id: item.id } })}>
            <Card.Title
                title={item.name}
                subtitle={`${item.role} • ${item.phone}`}
                left={(props) => <Avatar.Text {...props} label={item.name.substring(0, 2).toUpperCase()} />}
                right={(props) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                        {item.deposit_amount !== undefined && item.deposit_amount < 2000 && <Chip textStyle={{ fontSize: 10 }} style={{ height: 24 }} compact mode="outlined" icon="alert">Dep: {item.deposit_amount}</Chip>}
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

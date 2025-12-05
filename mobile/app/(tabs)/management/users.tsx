import { View, FlatList, StyleSheet } from 'react-native';
import { List, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';

const USERS = [
    { id: '1', name: 'John Doe', role: 'Admin', phone: '123-456-7890' },
    { id: '2', name: 'Jane Smith', role: 'User', phone: '098-765-4321' },
];

export default function UserList() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <FlatList
                data={USERS}
                keyExtractor={(item) => item.id}
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

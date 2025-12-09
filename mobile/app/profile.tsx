import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Button, List, Avatar, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import apiService from '../services/api.service';

export default function ProfileScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData] = await Promise.all([
                apiService.getUsers(),
            ]);
            setUsers(usersData);
            setCurrentUser(apiService.getCurrentUser());
        } catch (error) {
            console.error('Failed to load profile data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (user: any) => {
        apiService.setCurrentUser(user);
        setCurrentUser(user);
        Alert.alert('Success', `Logged in as ${user.name}`);
    };

    const handleLogout = () => {
        apiService.setCurrentUser(null);
        setCurrentUser(null);
        Alert.alert('Success', 'Logged out');
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Avatar.Icon 
                    size={80} 
                    icon={currentUser ? "account" : "account-outline"} 
                    style={{ backgroundColor: currentUser ? theme.colors.primary : '#ccc' }}
                />
                <Text variant="headlineSmall" style={styles.name}>
                    {currentUser ? currentUser.name : 'Guest'}
                </Text>
                <Text variant="bodyLarge" style={styles.role}>
                    {currentUser ? currentUser.role : 'Not Logged In'}
                </Text>
                
                {currentUser && (
                    <Button 
                        mode="outlined" 
                        onPress={handleLogout} 
                        style={styles.logoutButton}
                        textColor={theme.colors.error}
                    >
                        Logout
                    </Button>
                )}
            </View>

            <Divider style={styles.divider} />
            
            <Text variant="titleMedium" style={styles.sectionTitle}>Switch User / Login</Text>
            
            {users.map((user) => (
                <List.Item
                    key={user.id}
                    title={user.name}
                    description={`${user.role} • ${user.phone}`}
                    left={props => <List.Icon {...props} icon="account" />}
                    right={props => currentUser?.id === user.id ? <List.Icon {...props} icon="check" color="green" /> : null}
                    onPress={() => handleLogin(user)}
                    style={currentUser?.id === user.id ? styles.activeUser : undefined}
                />
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', padding: 24, backgroundColor: '#f5f5f5' },
    name: { marginTop: 16, fontWeight: 'bold' },
    role: { color: '#666' },
    logoutButton: { marginTop: 16, borderColor: 'red' },
    divider: { height: 1 },
    sectionTitle: { margin: 16, color: '#666' },
    activeUser: { backgroundColor: '#e8f5e9' },
});

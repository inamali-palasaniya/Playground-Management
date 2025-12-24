import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthService, User } from '../../services/auth.service';

export default function ManagementIndex() {
    const theme = useTheme();
    const router = useRouter();
    const [currentUser, setCurrentUser] = React.useState<User | null>(null);

    React.useEffect(() => {
        AuthService.getUser().then(setCurrentUser);
    }, []);

    const allModules = [
        {
            title: 'Cricket Scoring',
            icon: 'cricket',
            color: '#1b5e20',
            route: '/management/cricket',
            description: 'Manage matches, tournaments, and live scoring.'
        },
        {
            title: 'User Management',
            icon: 'account-multiple',
            color: '#0d47a1',
            route: '/(tabs)/users',
            description: 'Add, edit, and manage user permissions.'
        },
        {
            title: 'Expenses',
            icon: 'cash-register',
            color: '#b71c1c',
            route: '/management/expenses',
            description: 'Track and manage facility expenses.'
        },
        {
            title: 'Finance & Ledger',
            icon: 'book-open-variant',
            color: '#e65100',
            route: '/management/masters/index',
            description: 'View financial reports and ledgers.'
        },
        {
            title: 'Masters',
            icon: 'cog',
            color: '#455a64',
            route: '/management/masters/index',
            description: 'Configure groups, plans, and fine rules.'
        },
        {
            title: 'System Logs',
            icon: 'file-document-outline',
            color: '#333',
            route: '/management/logs/deleted',
            description: 'Audit logs and deleted records.'
        }
    ];

    const modules = allModules.filter(m => {
        if (!currentUser) return false;
        if (currentUser.role === 'SUPER_ADMIN') return true;

        switch (m.title) {
            case 'Cricket Scoring':
                return AuthService.hasPermission(currentUser, 'cricket_scoring', 'view');
            case 'User Management':
                return AuthService.hasPermission(currentUser, 'user', 'view');
            case 'Expenses':
                return AuthService.hasPermission(currentUser, 'expense', 'view');
            case 'Finance & Ledger':
                return AuthService.hasPermission(currentUser, 'finance', 'view');
            case 'Masters':
                return AuthService.hasPermission(currentUser, 'master_groups', 'view') ||
                    AuthService.hasPermission(currentUser, 'master_plans', 'view') ||
                    AuthService.hasPermission(currentUser, 'master_fines', 'view');
            case 'System Logs':
                return AuthService.hasPermission(currentUser, 'audit', 'view');
            default:
                return true;
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <IconButton icon="arrow-left" onPress={() => router.back()} />
                <Text variant="headlineMedium" style={styles.headerTitle}>Management Hub</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.grid}>
                    {modules.map((module, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.cardWrapper}
                            onPress={() => router.push(module.route as any)}
                        >
                            <Card style={styles.card}>
                                <Card.Content style={styles.cardContent}>
                                    <View style={[styles.iconContainer, { backgroundColor: module.color + '20' }]}>
                                        <MaterialCommunityIcons name={module.icon as any} size={32} color={module.color} />
                                    </View>
                                    <Text variant="titleMedium" style={styles.cardTitle}>{module.title}</Text>
                                    <Text variant="bodySmall" style={styles.cardDesc} numberOfLines={2}>
                                        {module.description}
                                    </Text>
                                </Card.Content>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 12,
        backgroundColor: 'white',
        elevation: 2,
    },
    headerTitle: {
        fontWeight: 'bold',
        marginLeft: 8,
    },
    scrollContent: {
        padding: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    cardWrapper: {
        width: '48%',
        marginBottom: 16,
    },
    card: {
        height: 160,
        borderRadius: 16,
        elevation: 3,
        backgroundColor: 'white',
    },
    cardContent: {
        alignItems: 'center',
        padding: 12,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    cardDesc: {
        textAlign: 'center',
        color: '#666',
        fontSize: 11,
    }
});

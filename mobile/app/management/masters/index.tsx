import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Divider, Appbar, useTheme, Card, Text, TouchableRipple, Avatar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MastersScreen() {
    const router = useRouter();
    const theme = useTheme();

    const MasterItem = ({ title, description, icon, color, route }: any) => (
        <Card style={styles.card} onPress={() => router.push(route)}>
            <Card.Content style={styles.cardContent}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <MaterialCommunityIcons name={icon} size={32} color={color} />
                </View>
                <View style={styles.textContainer}>
                    <Text variant="titleMedium" style={styles.cardTitle}>{title}</Text>
                    <Text variant="bodySmall" style={styles.cardDesc}>{description}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Manage Masters" titleStyle={{ color: 'white', fontWeight: 'bold' }} />
            </Appbar.Header>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text variant="titleMedium" style={styles.sectionHeader}>System Configuration</Text>

                <MasterItem
                    title="Subscription Plans"
                    description="Configure monthly rates, deposits, and billing cycles."
                    icon="notebook-edit"
                    color="#6200ee"
                    route="/management/masters/plans"
                />

                <MasterItem
                    title="Fine Rules"
                    description="Set penalties for late arrivals, dress code, etc."
                    icon="gavel"
                    color="#e65100"
                    route="/management/masters/fines"
                />

                <MasterItem
                    title="User Groups"
                    description="Categorize users into squads or departments."
                    icon="account-group" // changed from account-multiple-outline for consistency
                    color="#00695c"
                    route="/management/masters/groups"
                />

                <Text variant="titleMedium" style={[styles.sectionHeader, { marginTop: 16 }]}>Audit & History</Text>

                <MasterItem
                    title="Deleted Items"
                    description="View history of deleted records (Recycle Bin)."
                    icon="delete-restore"
                    color="#607D8B"
                    route="/management/logs/deleted"
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    scrollContent: { padding: 16 },
    sectionHeader: {
        marginBottom: 16,
        color: '#666',
        fontWeight: 'bold',
        marginLeft: 4
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardDesc: {
        color: 'gray',
    }
});

import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Card, Text, Button, useTheme, TouchableRipple, Title, Paragraph } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CricketDashboard() {
    const router = useRouter();
    const theme = useTheme();

    const modules = [
        {
            title: 'Tournaments',
            subtitle: 'Create & Manage Tournaments',
            icon: 'trophy',
            route: '/management/cricket/tournaments',
            color: '#FFD700' // Gold
        },
        {
            title: 'Teams',
            subtitle: 'Manage Teams & Squads',
            icon: 'shield-account',
            route: '/management/cricket/teams',
            color: '#2196F3' // Blue
        },
        {
            title: 'Matches',
            subtitle: 'Schedule & View Results',
            icon: 'cricket',
            route: '/management/cricket/matches',
            color: '#4CAF50' // Green
        },
        {
            title: 'Live Scorer',
            subtitle: 'Score a Match (Dark Mode)',
            icon: 'scoreboard',
            route: '/management/cricket/scorer',
            color: '#FF5722' // Deep Orange
        }
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Cricket Manager</Text>
                <Text variant="bodyMedium" style={{ color: 'gray' }}>Manage your turf tournaments</Text>
            </View>

            <View style={styles.grid}>
                {modules.map((module, index) => (
                    <Card
                        key={index}
                        style={styles.card}
                        onPress={() => router.push(module.route as any)}
                    >
                        <Card.Content style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <View style={[styles.iconContainer, { backgroundColor: module.color + '20' }]}>
                                <MaterialCommunityIcons name={module.icon as any} size={40} color={module.color} />
                            </View>
                            <Title style={{ marginTop: 12, fontSize: 16 }}>{module.title}</Title>
                            <Paragraph style={{ color: 'gray', textAlign: 'center', fontSize: 12 }}>{module.subtitle}</Paragraph>
                        </Card.Content>
                    </Card>
                ))}
            </View>

            {/* Quick Actions / Recent Activity could go here */}
            <Card style={[styles.card, { marginTop: 20 }]}>
                <Card.Title title="Recent Matches" left={(props) => <MaterialCommunityIcons {...props} name="history" />} />
                <Card.Content>
                    <Text style={{ textAlign: 'center', color: 'gray', marginVertical: 20 }}>No matches played yet.</Text>
                </Card.Content>
            </Card>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48%', marginBottom: 16, elevation: 2, backgroundColor: 'white' },
    iconContainer: {
        width: 70, height: 70, borderRadius: 35,
        justifyContent: 'center', alignItems: 'center', marginBottom: 5
    }
});

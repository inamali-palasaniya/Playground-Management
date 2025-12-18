import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, useTheme, Title, Paragraph, Appbar, Avatar, IconButton, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';

export default function CricketDashboard() {
    const router = useRouter();
    const theme = useTheme();
    const [recentMatches, setRecentMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        try {
            setLoading(true);
            const matches = await apiService.getMatches();
            // Sort by ID descending to get most recent
            const sorted = matches.sort((a, b) => b.id - a.id);
            setRecentMatches(sorted.slice(0, 5));
        } catch (error) {
            console.error('Failed to load recent matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const modules = [
        {
            title: 'Tournaments',
            subtitle: 'Create & Manage',
            icon: 'trophy',
            route: '/management/cricket/tournaments',
            color: '#FFD700'
        },
        {
            title: 'Teams',
            subtitle: 'Squad Management',
            icon: 'shield-account',
            route: '/management/cricket/teams',
            color: '#2196F3'
        },
        {
            title: 'Matches',
            subtitle: 'Schedule & Results',
            icon: 'cricket',
            route: '/management/cricket/matches',
            color: '#4CAF50'
        },
        {
            title: 'Live Scorer',
            subtitle: 'Dark Mode Scoring',
            icon: 'scoreboard',
            route: '/management/cricket/scorer',
            color: '#FF5722'
        }
    ];

    return (
        <SafeAreaView style={styles.safeArea}>
            <Appbar.Header elevated style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Cricket Manager" titleStyle={{ fontWeight: 'bold' }} />
            </Appbar.Header>

            <ScrollView
                style={styles.container}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View style={styles.grid}>
                    {modules.map((module, index) => (
                        <Card
                            key={index}
                            style={styles.card}
                            onPress={() => router.push(module.route as any)}
                        >
                            <Card.Content style={{ alignItems: 'center', paddingVertical: 16 }}>
                                <View style={[styles.iconContainer, { backgroundColor: module.color + '15' }]}>
                                    <MaterialCommunityIcons name={module.icon as any} size={32} color={module.color} />
                                </View>
                                <Title style={{ marginTop: 8, fontSize: 14 }}>{module.title}</Title>
                                <Paragraph style={{ color: 'gray', textAlign: 'center', fontSize: 10 }}>{module.subtitle}</Paragraph>
                            </Card.Content>
                        </Card>
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>Recent Matches</Text>
                    <Button mode="text" labelStyle={{ fontSize: 12 }} onPress={() => router.push('/management/cricket/matches')}>View All</Button>
                </View>

                {recentMatches.length > 0 ? (
                    recentMatches.map((match) => (
                        <Card
                            key={match.id}
                            style={styles.matchCard}
                            onPress={() => router.push({ pathname: '/management/cricket/matches', params: { id: match.id } })}
                        >
                            <Card.Content style={styles.matchContent}>
                                <View style={styles.teamInfo}>
                                    <Text variant="bodyLarge" numberOfLines={1} style={styles.teamName}>{match.team_a?.name}</Text>
                                    <View style={styles.vsContainer}>
                                        <Text variant="labelSmall" style={styles.vsText}>VS</Text>
                                    </View>
                                    <Text variant="bodyLarge" numberOfLines={1} style={styles.teamName}>{match.team_b?.name}</Text>
                                </View>
                                <View style={styles.matchMeta}>
                                    <Text variant="labelSmall" style={{ color: 'gray' }}>
                                        {format(new Date(match.start_time), 'MMM dd, yyyy')} • {match.tournament?.name}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: match.status === 'LIVE' ? '#ffebee' : '#e8f5e9' }]}>
                                        <Text style={[styles.statusText, { color: match.status === 'LIVE' ? '#d32f2f' : '#2e7d32' }]}>
                                            {match.status}
                                        </Text>
                                    </View>
                                </View>
                            </Card.Content>
                        </Card>
                    ))
                ) : (
                    <Card style={styles.emptyCard}>
                        <Card.Content style={{ alignItems: 'center', paddingVertical: 30 }}>
                            <MaterialCommunityIcons name="calendar-blank" size={48} color="#ccc" />
                            <Text style={{ marginTop: 12, color: 'gray' }}>No recent matches found</Text>
                            <Button mode="contained-tonal" style={{ marginTop: 16 }} onPress={() => router.push('/management/cricket/matches')}>
                                Schedule First Match
                            </Button>
                        </Card.Content>
                    </Card>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'white' },
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
    card: { width: '48%', marginBottom: 16, borderRadius: 12, elevation: 1, backgroundColor: 'white' },
    iconContainer: {
        width: 56, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center', marginBottom: 4
    },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 },
    matchCard: { marginBottom: 12, borderRadius: 12, elevation: 1, backgroundColor: 'white' },
    matchContent: { paddingVertical: 12 },
    teamInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    teamName: { flex: 1, textAlign: 'center', fontWeight: 'bold' },
    vsContainer: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8 },
    vsText: { color: 'gray', fontWeight: 'bold' },
    matchMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    emptyCard: { borderRadius: 12, backgroundColor: 'white' }
});


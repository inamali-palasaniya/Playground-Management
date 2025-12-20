import { View, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator, Appbar, Avatar, useTheme, Surface, Divider, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import apiService from '../../../services/api.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

export default function ScoringDashboard() {
    const router = useRouter();
    const theme = useTheme();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMatches = async () => {
        try {
            const data = await apiService.getMatches();
            // Sort by status (LIVE first) then by ID
            const sorted = data.sort((a, b) => {
                if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
                if (a.status !== 'LIVE' && b.status === 'LIVE') return 1;
                return b.id - a.id;
            });
            setMatches(sorted);
        } catch (error) {
            console.error('Failed to fetch matches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMatches();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'LIVE': return '#d32f2f';
            case 'COMPLETED': return '#2e7d32';
            case 'SCHEDULED': return '#1976d2';
            default: return 'gray';
        }
    };

    const renderMatchCard = ({ item }: { item: any }) => {
        const isLive = item.status === 'LIVE';
        return (
            <Card
                style={[styles.card, isLive && styles.liveCard]}
                onPress={() => {
                    if (isLive || item.status === 'COMPLETED') {
                        router.push(`/(tabs)/scoring/live/${item.id}`);
                    } else {
                        router.push({ pathname: '/management/cricket/scorer', params: { matchId: item.id } });
                    }
                }}
            >
                <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Text variant="labelSmall" style={styles.tournamentName}>
                            {item.tournament?.name || 'Friendly Match'}
                        </Text>
                        <Chip
                            compact
                            style={{ height: 20, backgroundColor: getStatusColor(item.status) + '15' }}
                            textStyle={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: 'bold' }}
                        >
                            {item.status}
                        </Chip>
                    </View>

                    <View style={styles.matchTeams}>
                        <View style={styles.teamSide}>
                            <Avatar.Text size={40} label={item.team_a?.name?.substring(0, 2).toUpperCase() || 'A'} />
                            <Text variant="titleSmall" style={styles.teamText} numberOfLines={1}>{item.team_a?.name}</Text>
                        </View>

                        <View style={styles.vsCircle}>
                            <Text variant="labelSmall" style={{ fontWeight: 'bold', color: 'gray' }}>VS</Text>
                        </View>

                        <View style={[styles.teamSide, { alignItems: 'flex-end' }]}>
                            <Avatar.Text size={40} label={item.team_b?.name?.substring(0, 2).toUpperCase() || 'B'} />
                            <Text variant="titleSmall" style={[styles.teamText, { textAlign: 'right' }]} numberOfLines={1}>{item.team_b?.name}</Text>
                        </View>
                    </View>

                    <Divider style={{ marginVertical: 12 }} />

                    <View style={styles.cardFooter}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="clock-outline" size={14} color="gray" />
                            <Text variant="bodySmall" style={styles.matchDate}>
                                {format(new Date(item.start_time), 'MMM dd, p')}
                            </Text>
                        </View>
                        <Text variant="bodySmall" style={{ color: '#888', fontStyle: 'italic' }}>
                            By: {item.created_by?.name || 'N/A'}
                        </Text>
                        <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                            {item.overs} Overs
                        </Text>
                    </View>
                </Card.Content>
            </Card>
        );
    };

    return (
        <View style={styles.container}>
            <Surface style={styles.headerSurface} elevation={2}>
                <View style={styles.header}>
                    <View>
                        <Text variant="headlineSmall" style={styles.title}>Match Center</Text>
                        <Text variant="labelMedium" style={styles.subtitle}>CricHeroes Clone • Live Scores</Text>
                    </View>
                    <IconButton icon="plus-circle" mode="contained" containerColor={theme.colors.primary} iconColor="white" onPress={() => router.push('/management/cricket/matches/create')} />
                </View>
            </Surface>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderMatchCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="cricket" size={64} color="#ddd" />
                            <Text style={styles.emptyText}>No matches found. Schedule one!</Text>
                            <Button mode="contained" style={{ marginTop: 20 }} onPress={() => router.push('/management/cricket/matches/create')}>Schedule Match</Button>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    headerSurface: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: 'white', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontWeight: 'bold', color: '#1a1a1a' },
    subtitle: { color: 'gray' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16, paddingBottom: 100 },
    card: { marginBottom: 16, backgroundColor: 'white', borderRadius: 16, elevation: 2, borderLeftWidth: 0 },
    liveCard: { borderLeftWidth: 4, borderLeftColor: '#d32f2f' },
    cardContent: { padding: 8 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    tournamentName: { color: 'gray', fontWeight: '500' },
    matchTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    teamSide: { flex: 1, alignItems: 'flex-start' },
    teamText: { marginTop: 8, fontWeight: 'bold', width: '100%' },
    vsCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10 },
    divider: { height: 1, backgroundColor: '#f0f0f0' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    matchDate: { color: 'gray', marginLeft: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: 'gray', marginTop: 16, fontSize: 16 }
});


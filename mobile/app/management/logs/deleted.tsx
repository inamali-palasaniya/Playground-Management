import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Appbar, useTheme, Card, Text, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import apiService from '../../../services/api.service';
import { format } from 'date-fns';

export default function DeletedLogsScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filterType, setFilterType] = useState<string | null>(null); // USER, EXPENSE, PLAN etc.

    const ENTITY_TYPES = ['USER', 'EXPENSE', 'PLAN', 'FINE_RULE', 'GROUP'];

    const loadLogs = async () => {
        try {
            setLoading(true);
            const data = await apiService.request(`/api/logs/deleted${filterType ? `?entityType=${filterType}` : ''}`);
            setLogs(data as any[]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, [filterType]);

    const onRefresh = () => {
        setRefreshing(true);
        loadLogs();
    };

    const formatDetails = (details: any) => {
        if (!details) return '';
        // Extract basic info if possible
        const parts = [];
        if (details.name) parts.push(`Name: ${details.name}`);
        if (details.email) parts.push(`Email: ${details.email}`);
        if (details.amount) parts.push(`Amount: ${details.amount}`);
        return parts.join(' | ') || JSON.stringify(details);
    };

    const renderItem = ({ item }: { item: any }) => (
        <Card style={styles.card}>
            <Card.Content>
                <View style={styles.header}>
                    <Chip compact textStyle={{ fontSize: 10 }}>{item.entity_type}</Chip>
                    <Text variant="bodySmall" style={{ color: '#888' }}>
                        {format(new Date(item.timestamp), 'dd MMM yy HH:mm')}
                    </Text>
                </View>
                <Text variant="titleMedium" style={{ marginTop: 8 }}>
                    Deleted ID: {item.entity_id}
                </Text>
                <Text variant="bodyMedium" style={{ color: '#555', marginTop: 4 }}>
                    {formatDetails(item.details)}
                </Text>
                <Divider style={{ marginVertical: 8 }} />
                <Text variant="bodySmall">
                    Deleted By: {item.performed_by?.name || 'Unknown'}
                </Text>
            </Card.Content>
        </Card>
    );

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Deleted Items Log" titleStyle={{ color: 'white' }} />
            </Appbar.Header>

            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    data={['ALL', ...ENTITY_TYPES]}
                    keyExtractor={item => item}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <Chip
                            selected={filterType === (item === 'ALL' ? null : item)}
                            onPress={() => setFilterType(item === 'ALL' ? null : item)}
                            style={styles.chip}
                            mode="outlined"
                        >
                            {item}
                        </Chip>
                    )}
                />
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={item => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>No deleted items found.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    filterContainer: { padding: 10, backgroundColor: 'white' },
    chip: { marginRight: 8 },
    list: { padding: 16 },
    card: { marginBottom: 12, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});

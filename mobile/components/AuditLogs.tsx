import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Modal, Portal, Text, IconButton, DataTable, ActivityIndicator, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/api.service';
import { format } from 'date-fns';

interface AuditLogsProps {
    visible: boolean;
    onDismiss: () => void;
    entityType: string;
    entityId: number | null;
    title?: string;
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ visible, onDismiss, entityType, entityId, title }) => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && entityId) {
            loadLogs();
        }
    }, [visible, entityId]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const data = await apiService.request(`/api/logs/entity/${entityType}/${entityId}`);
            setLogs((data as any[]) || []);
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderDetails = (details: any) => {
        if (!details) return null;
        if (details.changes) {
            return (
                <View style={styles.changesContainer}>
                    {Object.entries(details.changes).map(([key, value]: [string, any]) => (
                        <View key={key} style={styles.changeRow}>
                            <Text style={styles.changeKey}>{key}: </Text>
                            <Text style={styles.changeFrom}>{String(value.from ?? 'N/A')}</Text>
                            <MaterialCommunityIcons name="arrow-right" size={12} color="gray" />
                            <Text style={styles.changeTo}>{String(value.to ?? 'N/A')}</Text>
                        </View>
                    ))}
                </View>
            );
        }
        return <Text style={styles.detailsJson}>{JSON.stringify(details, null, 2)}</Text>;
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="history" size={24} color="#1565c0" style={{ marginRight: 10 }} />
                        <Text variant="titleLarge" style={styles.title}>{title || 'History Logs'}</Text>
                    </View>
                    <IconButton icon="close" onPress={onDismiss} />
                </View>

                {loading ? (
                    <ActivityIndicator style={{ margin: 20 }} />
                ) : logs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={{ color: 'gray' }}>No history records found.</Text>
                    </View>
                ) : (
                    <ScrollView style={styles.logList}>
                        {logs.map((log) => (
                            <Card key={log.id} style={styles.logCard}>
                                <View style={styles.logHeader}>
                                    <View style={[styles.actionBadge, { backgroundColor: log.action === 'CREATE' ? '#4CAF50' : log.action === 'UPDATE' ? '#2196F3' : '#F44336' }]}>
                                        <Text style={styles.actionText}>{log.action}</Text>
                                    </View>
                                    <Text style={styles.timestamp}>{format(new Date(log.timestamp), 'MMM d, h:mm a')}</Text>
                                </View>
                                <View style={styles.performerRow}>
                                    <MaterialCommunityIcons name="account-edit" size={16} color="gray" />
                                    <Text style={styles.performerText}>By: {log.performed_by?.name || 'Unknown'}</Text>
                                </View>
                                <View style={styles.detailsContent}>
                                    {renderDetails(log.details)}
                                </View>
                            </Card>
                        ))}
                    </ScrollView>
                )}
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modal: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        padding: 0,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontWeight: 'bold',
        color: '#1565c0',
    },
    logList: {
        padding: 16,
    },
    logCard: {
        marginBottom: 12,
        padding: 12,
        backgroundColor: '#fff',
        elevation: 1,
    },
    logHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    actionText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    timestamp: {
        fontSize: 11,
        color: 'gray',
    },
    performerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    performerText: {
        fontSize: 12,
        color: '#555',
        marginLeft: 4,
    },
    detailsContent: {
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f9f9f9',
    },
    changesContainer: {
        marginTop: 4,
    },
    changeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    changeKey: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#333',
    },
    changeFrom: {
        fontSize: 11,
        color: '#d32f2f',
        textDecorationLine: 'line-through',
        marginRight: 4,
    },
    changeTo: {
        fontSize: 11,
        color: '#388e3c',
        marginLeft: 4,
    },
    detailsJson: {
        fontSize: 10,
        color: '#666',
        fontFamily: 'monospace',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    }
});

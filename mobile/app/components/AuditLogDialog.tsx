import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, ActivityIndicator, Divider, useTheme, Card } from 'react-native-paper';
import { format } from 'date-fns';
import apiService from '../../services/api.service';

interface AuditLog {
    id: number;
    action: string;
    performed_by: { name: string; email: string };
    details: any;
    timestamp: string;
}

interface AuditLogDialogProps {
    visible: boolean;
    onDismiss: () => void;
    entityType: string;
    entityId: number | null;
}

export default function AuditLogDialog({ visible, onDismiss, entityType, entityId }: AuditLogDialogProps) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        if (visible && entityId) {
            fetchLogs();
        }
    }, [visible, entityId]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await apiService.request(`/api/logs/entity/${entityType}/${entityId}`);
            setLogs(data as AuditLog[]);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDetails = (details: any) => {
        if (!details) return 'No details';
        try {
            // If details is object, stringify nicely
            return JSON.stringify(details, null, 2).replace(/[\{\}"]/g, '').trim();
        } catch (e) {
            return String(details);
        }
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="titleLarge" style={styles.title}>History</Text>

                {loading ? (
                    <ActivityIndicator animating={true} style={styles.loader} />
                ) : logs.length === 0 ? (
                    <Text style={{ textAlign: 'center', margin: 20 }}>No history found.</Text>
                ) : (
                    <ScrollView style={styles.scroll}>
                        {logs.map((log) => (
                            <Card key={log.id} style={styles.card}>
                                <Card.Content>
                                    <View style={styles.header}>
                                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                                            {log.action}
                                        </Text>
                                        <Text variant="labelSmall" style={{ color: '#888' }}>
                                            {format(new Date(log.timestamp), 'dd MMM yy HH:mm')}
                                        </Text>
                                    </View>
                                    <Text variant="bodyMedium" style={{ fontWeight: 'bold', marginVertical: 4 }}>
                                        By: {log.performed_by?.name || 'Unknown'}
                                    </Text>
                                    <Divider style={{ marginVertical: 4 }} />
                                    <Text variant="bodySmall" style={{ fontFamily: 'monospace' }}>
                                        {formatDetails(log.details)}
                                    </Text>
                                </Card.Content>
                            </Card>
                        ))}
                    </ScrollView>
                )}

                <Button onPress={onDismiss} style={styles.closeBtn}>Close</Button>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
        maxHeight: '80%'
    },
    title: {
        marginBottom: 10,
        textAlign: 'center'
    },
    loader: {
        margin: 20
    },
    scroll: {
        marginTop: 10
    },
    card: {
        marginBottom: 10,
        backgroundColor: '#f9f9f9',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    closeBtn: {
        marginTop: 10
    }
});

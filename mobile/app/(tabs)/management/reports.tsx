import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, Card, Button, List, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import apiService from '../../../services/api.service';
import { useState } from 'react';

export default function ReportsScreen() {
    const router = useRouter();
    const [downloading, setDownloading] = useState(false);

    const downloadFile = async (url: string, filename: string) => {
        try {
            setDownloading(true);

            // Check if sharing is available
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            // @ts-ignore
            const fileUri = (FileSystem.documentDirectory || '') + filename;
            const downloadRes = await FileSystem.downloadAsync(url, fileUri);

            if (downloadRes.status !== 200) {
                throw new Error('Download failed');
            }

            await Sharing.shareAsync(downloadRes.uri);

        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to download report');
        } finally {
            setDownloading(false);
        }
    };

    const handleFinancialReport = async () => {
        // Default to last 30 days
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const url = await apiService.downloadFinancialReport(start.toISOString(), end.toISOString());
        await downloadFile(url, 'financial-report.xlsx');
    };

    const handleUserReport = async () => {
        const url = await apiService.downloadUserReport();
        await downloadFile(url, 'users-report.xlsx');
    };

    const handleStopServer = async () => {
        try {
            await apiService.stopWebSocketServer();
            Alert.alert('Success', 'WebSocket server stopped');
        } catch (error) {
            Alert.alert('Error', 'Failed to stop server');
        }
    };

    const handleStartServer = async () => {
        try {
            await apiService.startWebSocketServer();
            Alert.alert('Success', 'WebSocket server started (Clients disconnected)');
        } catch (error) {
            Alert.alert('Error', 'Failed to start server');
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>Reports & Admin</Text>

            <Card style={styles.card}>
                <Card.Title title="Export Reports" left={props => <List.Icon {...props} icon="file-excel" />} />
                <Card.Content>
                    <Button
                        mode="contained"
                        onPress={handleFinancialReport}
                        loading={downloading}
                        icon="finance"
                        style={styles.button}
                    >
                        Financial Report (Last 30 Days)
                    </Button>
                    <Button
                        mode="outlined"
                        onPress={handleUserReport}
                        loading={downloading}
                        icon="account-group"
                        style={styles.button}
                    >
                        User Directory Report
                    </Button>
                </Card.Content>
            </Card>

            <Card style={[styles.card, styles.dangerZone]}>
                <Card.Title title="Server Controls (Admin)" left={props => <List.Icon {...props} icon="server" />} />
                <Card.Content>
                    <Text variant="bodySmall" style={{ marginBottom: 12 }}>
                        Control the WebSocket server to manage resources.
                    </Text>
                    <Button
                        mode="contained"
                        buttonColor="#dc2626"
                        onPress={handleStopServer}
                        style={styles.button}
                    >
                        Stop WebSocket Server
                    </Button>
                    <Button
                        mode="contained"
                        buttonColor="#16a34a"
                        onPress={handleStartServer}
                        style={styles.button}
                    >
                        Reset WebSocket Server
                    </Button>
                </Card.Content>
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f4f6',
        padding: 16,
    },
    header: {
        marginBottom: 16,
        fontWeight: 'bold',
    },
    card: {
        marginBottom: 16,
        backgroundColor: 'white',
    },
    button: {
        marginBottom: 12,
    },
    dangerZone: {
        borderLeftWidth: 4,
        borderLeftColor: '#dc2626',
    }
});

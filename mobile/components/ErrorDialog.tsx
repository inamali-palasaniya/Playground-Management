import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Dialog, Button, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ErrorDialogProps {
    visible: boolean;
    title?: string;
    message: string;
    details?: string;
    onDismiss: () => void;
}

export const ErrorDialog = ({ visible, title = 'Error', message, details, onDismiss }: ErrorDialogProps) => {
    const theme = useTheme();

    return (
        <Portal>
            <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
                <Dialog.Title style={styles.titleRow}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.error} />
                        <Text style={[styles.title, { color: theme.colors.error }]}>{title}</Text>
                    </View>
                </Dialog.Title>
                <Dialog.Content>
                    <Text variant="bodyMedium" style={styles.message}>{message}</Text>
                    {details && (
                        <View style={styles.detailsContainer}>
                            <Text style={styles.detailsTitle}>Technical Details:</Text>
                            <Text style={styles.detailsText}>{details}</Text>
                        </View>
                    )}
                </Dialog.Content>
                <Dialog.Actions>
                    <Button onPress={onDismiss} mode="contained" buttonColor={theme.colors.error}>
                        Dismiss
                    </Button>
                </Dialog.Actions>
            </Dialog>
        </Portal>
    );
};

const styles = StyleSheet.create({
    dialog: {
        borderRadius: 12,
        backgroundColor: 'white',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    message: {
        marginTop: 10,
        color: '#444',
    },
    detailsContainer: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: '#ccc',
    },
    detailsTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    detailsText: {
        fontSize: 10,
        color: '#888',
        fontFamily: 'monospace',
    },
});

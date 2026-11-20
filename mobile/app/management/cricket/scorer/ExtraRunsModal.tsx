import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, Button, Divider, useTheme } from 'react-native-paper';

interface ExtraRunsModalProps {
    visible: boolean;
    onDismiss: () => void;
    extraType: 'WD' | 'NB' | 'BYE' | 'LB' | null;
    onConfirm: (runs: number, extraType: string) => void;
}

export default function ExtraRunsModal({ visible, onDismiss, extraType, onConfirm }: ExtraRunsModalProps) {
    const theme = useTheme();

    if (!extraType) return null;

    const getTitle = () => {
        switch (extraType) {
            case 'WD': return 'Wide Ball Extras';
            case 'NB': return 'No Ball Extras';
            case 'BYE': return 'Bye Runs';
            case 'LB': return 'Leg Bye Runs';
            default: return 'Extras';
        }
    };

    const getOptions = () => {
        if (extraType === 'WD') {
            return [
                { label: '1 (Wide)', runs: 1 },
                { label: '2 (WD + 1)', runs: 2 },
                { label: '3 (WD + 2)', runs: 3 },
                { label: '5 (WD + 4 Four)', runs: 5 },
            ];
        }
        if (extraType === 'NB') {
            return [
                { label: '1 (No Ball)', runs: 1 },
                { label: '2 (NB + 1 run)', runs: 2 },
                { label: '3 (NB + 2 runs)', runs: 3 },
                { label: '5 (NB + 4 Four)', runs: 5 },
                { label: '7 (NB + 6 Six!)', runs: 7 },
            ];
        }
        return [
            { label: '1 Run', runs: 1 },
            { label: '2 Runs', runs: 2 },
            { label: '3 Runs', runs: 3 },
            { label: '4 (Four)', runs: 4 },
        ];
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="titleMedium" style={styles.title}>{getTitle()}</Text>
                <Text variant="bodySmall" style={styles.subtitle}>Select total runs including the extra</Text>

                <View style={styles.optionsGrid}>
                    {getOptions().map(opt => (
                        <TouchableOpacity
                            key={opt.runs}
                            style={styles.optionBtn}
                            onPress={() => {
                                onConfirm(opt.runs, extraType);
                                onDismiss();
                            }}
                        >
                            <Text variant="titleMedium" style={styles.optionText}>{opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Button mode="text" onPress={onDismiss} style={{ marginTop: 12 }}>
                    Cancel
                </Button>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 20, margin: 24, borderRadius: 16 },
    title: { fontWeight: 'bold', textAlign: 'center', color: '#1E3A8A' },
    subtitle: { textAlign: 'center', color: '#666', marginBottom: 16, marginTop: 4 },
    optionsGrid: { gap: 10 },
    optionBtn: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    optionText: { fontWeight: 'bold', color: '#1E293B' }
});

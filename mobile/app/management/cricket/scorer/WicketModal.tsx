import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton, Chip, Divider, useTheme } from 'react-native-paper';

interface WicketModalProps {
    visible: boolean;
    onDismiss: () => void;
    strikerName: string;
    nonStrikerName: string;
    strikerId: number;
    nonStrikerId: number;
    availableBatsmen: any[];
    onConfirm: (data: {
        wicketType: string;
        outPlayerId: number;
        newStrikerId?: number;
        isAllOut: boolean;
    }) => void;
}

const WICKET_TYPES = [
    { label: 'Bowled', value: 'BOWLED' },
    { label: 'Caught', value: 'CAUGHT' },
    { label: 'Run Out', value: 'RUN_OUT' },
    { label: 'LBW', value: 'LBW' },
    { label: 'Stumped', value: 'STUMPED' },
    { label: 'Hit Wicket', value: 'HIT_WICKET' },
];

export default function WicketModal({
    visible,
    onDismiss,
    strikerName,
    nonStrikerName,
    strikerId,
    nonStrikerId,
    availableBatsmen,
    onConfirm
}: WicketModalProps) {
    const theme = useTheme();
    const [wicketType, setWicketType] = useState('BOWLED');
    const [outPlayerId, setOutPlayerId] = useState<number>(strikerId);
    const [newStrikerId, setNewStrikerId] = useState<number | null>(null);

    React.useEffect(() => {
        if (visible) {
            setWicketType('BOWLED');
            setOutPlayerId(strikerId);
            setNewStrikerId(availableBatsmen.length > 0 ? (availableBatsmen[0].id || availableBatsmen[0].user?.id) : null);
        }
    }, [visible, strikerId, availableBatsmen]);

    const isAllOut = availableBatsmen.length === 0;

    const handleConfirm = () => {
        onConfirm({
            wicketType,
            outPlayerId,
            newStrikerId: isAllOut ? undefined : (newStrikerId || undefined),
            isAllOut
        });
        onDismiss();
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="titleLarge" style={styles.title}>💥 Wicket Fall</Text>

                <ScrollView style={{ maxHeight: 420 }}>
                    <Text variant="labelLarge" style={styles.sectionLabel}>Dismissal Type</Text>
                    <View style={styles.chipsRow}>
                        {WICKET_TYPES.map(w => (
                            <Chip
                                key={w.value}
                                selected={wicketType === w.value}
                                onPress={() => setWicketType(w.value)}
                                style={[styles.chip, wicketType === w.value && { backgroundColor: '#FF5252' }]}
                                textStyle={{ color: wicketType === w.value ? 'white' : '#333', fontWeight: 'bold', fontSize: 12 }}
                            >
                                {w.label}
                            </Chip>
                        ))}
                    </View>

                    {wicketType === 'RUN_OUT' && (
                        <View style={{ marginTop: 12 }}>
                            <Text variant="labelLarge" style={styles.sectionLabel}>Who Got Run Out?</Text>
                            <RadioButton.Group
                                onValueChange={v => setOutPlayerId(Number(v))}
                                value={outPlayerId.toString()}
                            >
                                <View style={styles.radioRow}>
                                    <View style={styles.radioItem}>
                                        <RadioButton value={strikerId.toString()} />
                                        <Text variant="bodyMedium">Striker: {strikerName}</Text>
                                    </View>
                                    <View style={styles.radioItem}>
                                        <RadioButton value={nonStrikerId.toString()} />
                                        <Text variant="bodyMedium">Non-Striker: {nonStrikerName}</Text>
                                    </View>
                                </View>
                            </RadioButton.Group>
                        </View>
                    )}

                    <Divider style={{ marginVertical: 14 }} />

                    {isAllOut ? (
                        <View style={styles.allOutBanner}>
                            <Text variant="titleMedium" style={{ color: '#D32F2F', fontWeight: 'bold' }}>All Out!</Text>
                            <Text variant="bodySmall" style={{ color: '#666' }}>No more batsmen available in this squad. Innings will conclude.</Text>
                        </View>
                    ) : (
                        <View>
                            <Text variant="labelLarge" style={styles.sectionLabel}>Select Next Batsman</Text>
                            <RadioButton.Group
                                onValueChange={v => setNewStrikerId(Number(v))}
                                value={newStrikerId?.toString() || ''}
                            >
                                {availableBatsmen.map(p => {
                                    const pId = p.id || p.user?.id;
                                    const pName = p.name || p.user?.name || `Player ${pId}`;
                                    return (
                                        <RadioButton.Item
                                            key={pId}
                                            label={pName}
                                            value={pId.toString()}
                                            style={styles.playerItem}
                                        />
                                    );
                                })}
                            </RadioButton.Group>
                        </View>
                    )}
                </ScrollView>

                <View style={styles.actionRow}>
                    <Button mode="outlined" onPress={onDismiss} style={{ flex: 1, marginRight: 8 }}>
                        Cancel
                    </Button>
                    <Button
                        mode="contained"
                        buttonColor="#D32F2F"
                        textColor="white"
                        onPress={handleConfirm}
                        disabled={!isAllOut && !newStrikerId}
                        style={{ flex: 1, marginLeft: 8 }}
                    >
                        Confirm Wicket
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 16 },
    title: { fontWeight: 'bold', textAlign: 'center', marginBottom: 12, color: '#D32F2F' },
    sectionLabel: { fontWeight: 'bold', marginBottom: 8, color: '#555' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    chip: { marginVertical: 3 },
    radioRow: { flexDirection: 'column', gap: 4 },
    radioItem: { flexDirection: 'row', alignItems: 'center' },
    playerItem: { paddingVertical: 2 },
    allOutBanner: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 8, marginVertical: 8, alignItems: 'center' },
    actionRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }
});

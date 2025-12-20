import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton, Card, Avatar } from 'react-native-paper';

interface PlayerSelectProps {
    visible: boolean;
    onDismiss: () => void;
    title: string;
    players: any[];
    onSelect: (player: any) => void;
}

export default function SelectPlayerModal({ visible, onDismiss, title, players, onSelect }: PlayerSelectProps) {
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const handleConfirm = () => {
        if (selectedId) {
            const player = players.find(p => p.id === selectedId);
            onSelect(player);
        }
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="headlineSmall" style={{ marginBottom: 15, textAlign: 'center' }}>{title}</Text>

                <ScrollView style={{ maxHeight: 300 }}>
                    <RadioButton.Group onValueChange={(v) => setSelectedId(parseInt(v))} value={selectedId?.toString() || ''}>
                        {players.map((p) => (
                            <RadioButton.Item
                                key={p.id}
                                label={p?.name || p?.user?.name || 'Unknown Player'}
                                value={p?.id?.toString() || Math.random().toString()}
                                style={styles.item}
                            />
                        ))}
                    </RadioButton.Group>
                </ScrollView>

                <Button
                    mode="contained"
                    onPress={handleConfirm}
                    style={{ marginTop: 20 }}
                    disabled={!selectedId}
                >
                    Confirm
                </Button>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 8 },
    item: { paddingVertical: 5 }
});

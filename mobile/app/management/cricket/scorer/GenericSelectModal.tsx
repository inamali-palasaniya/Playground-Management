import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Text, Button, RadioButton } from 'react-native-paper';

interface GenericSelectProps {
    visible: boolean;
    onDismiss: () => void;
    title: string;
    items: { id: number | string, name: string }[];
    onSelect: (item: any) => void;
    selectedValue?: any;
}

export default function GenericSelectModal({ visible, onDismiss, title, items, onSelect, selectedValue }: GenericSelectProps) {
    const [localValue, setLocalValue] = useState<string>(selectedValue?.toString() || '');

    React.useEffect(() => {
        if (visible) setLocalValue(selectedValue?.toString() || '');
    }, [visible, selectedValue]);

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Text variant="headlineSmall" style={styles.title}>{title}</Text>

                <ScrollView style={styles.list}>
                    <RadioButton.Group onValueChange={v => setLocalValue(v)} value={localValue}>
                        {items.map((item) => (
                            <RadioButton.Item
                                key={item.id}
                                label={item.name}
                                value={item.id.toString()}
                                style={styles.item}
                            />
                        ))}
                    </RadioButton.Group>
                </ScrollView>

                <View style={styles.actions}>
                    <Button onPress={onDismiss}>Cancel</Button>
                    <Button
                        mode="contained"
                        onPress={() => {
                            const item = items.find(i => i.id.toString() === localValue);
                            if (item) onSelect(item);
                            onDismiss();
                        }}
                        disabled={!localValue}
                    >
                        Select
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: 'white', padding: 20, margin: 20, borderRadius: 12, maxHeight: '80%' },
    title: { marginBottom: 15, textAlign: 'center', fontWeight: 'bold' },
    list: { marginBottom: 15 },
    item: { paddingVertical: 4 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 }
});

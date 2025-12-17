import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Modal, Portal, Text, Switch, Button, Card, useTheme } from 'react-native-paper';

interface SettingsModalProps {
    visible: boolean;
    onDismiss: () => void;
    settings: any;
    onUpdateSettings: (newSettings: any) => void;
}

export default function SettingsModal({ visible, onDismiss, settings, onUpdateSettings }: SettingsModalProps) {
    const theme = useTheme();

    const toggleRebowl = () => {
        onUpdateSettings({ ...settings, rebowlWideOrNoBall: !settings.rebowlWideOrNoBall });
    };

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.container}>
                <Card>
                    <Card.Title title="Match Settings (Turf Rules)" />
                    <Card.Content>
                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>Re-bowl Wides & No Balls?</Text>
                                <Text variant="bodySmall" style={{ color: 'gray' }}>
                                    {settings.rebowlWideOrNoBall 
                                        ? "Standard Cricket: Wides/No-Balls are not legal deliveries."
                                        : "Turf Rule: Wides/No-Balls count as legal deliveries (Over progresses)."
                                    }
                                </Text>
                            </View>
                            <Switch value={settings.rebowlWideOrNoBall} onValueChange={toggleRebowl} color={theme.colors.primary} />
                        </View>
                    </Card.Content>
                    <Card.Actions>
                        <Button onPress={onDismiss}>Done</Button>
                    </Card.Actions>
                </Card>
            </Modal>
        </Portal>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, margin: 20 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 }
});

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import apiService from '../../../services/api.service';

export default function FinesScreen() {
    const insets = useSafeAreaInsets();
    const [fines, setFines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [firstTime, setFirstTime] = useState('');
    const [subsequent, setSubsequent] = useState('');
    const [saving, setSaving] = useState(false);

    const loadFines = async () => {
        setLoading(true);
        try {
            const data = await apiService.getFineRules();
            setFines(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadFines();
        }, [])
    );

    const handleOpenCreate = () => {
        setEditingId(null);
        setName('');
        setFirstTime('');
        setSubsequent('');
        setVisible(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setName(item.name);
        setFirstTime(String(item.first_time_fine || 0));
        setSubsequent(String(item.subsequent_fine || 0));
        setVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Fine Rule', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.deleteFineRule(id);
                        loadFines();
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!name) { Alert.alert('Error', 'Name is required'); return; }
        setSaving(true);
        try {
            const payload = {
                name,
                first_time_fine: parseFloat(firstTime) || 0,
                subsequent_fine: parseFloat(subsequent) || 0,
            };

            if (editingId) {
                await apiService.updateFineRule(editingId, payload);
            } else {
                await apiService.createFineRule(payload);
            }

            setVisible(false);
            loadFines();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save fine rule');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {fines.map((fine) => (
                        <List.Item
                            key={fine.id}
                            title={fine.name}
                            description={`1st: ${fine.first_time_fine}, Next: ${fine.subsequent_fine}`}
                            left={props => <List.Icon {...props} icon="gavel" />}
                            right={props => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton icon="pencil" onPress={() => handleOpenEdit(fine)} />
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(fine.id)} />
                                </View>
                            )}
                        />
                    ))}
                </ScrollView>
            )}
            <FAB icon="plus" style={styles.fab} onPress={handleOpenCreate} label="Add Fine Rule" />

            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title>{editingId ? 'Edit Fine Rule' : 'New Fine Rule'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
                        <TextInput label="First Time Fine" value={firstTime} onChangeText={setFirstTime} keyboardType="numeric" style={styles.input} />
                        <TextInput label="Subsequent Fine" value={subsequent} onChangeText={setSubsequent} keyboardType="numeric" style={styles.input} />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setVisible(false)}>Cancel</Button>
                        <Button onPress={handleSave} loading={saving}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    input: { marginBottom: 10, backgroundColor: 'white' }
});

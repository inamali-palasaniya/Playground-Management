import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import apiService from '../../../services/api.service';

export default function GroupsScreen() {
    const insets = useSafeAreaInsets();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const data = await apiService.getGroups();
            setGroups(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadGroups();
        }, [])
    );

    const handleOpenCreate = () => {
        setEditingId(null);
        setName('');
        setVisible(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setName(item.name);
        setVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Group', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/groups/${id}`, { method: 'DELETE' });
                        loadGroups();
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!name) { Alert.alert('Error', 'Name is required'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await apiService.request(`/api/groups/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name })
                });
            } else {
                await apiService.request('/api/groups', {
                    method: 'POST',
                    body: JSON.stringify({ name })
                });
            }

            setVisible(false);
            loadGroups();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save group');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {groups.map((group) => (
                        <List.Item
                            key={group.id}
                            title={group.name}
                            left={props => <List.Icon {...props} icon="account-group" />}
                            right={props => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton icon="pencil" onPress={() => handleOpenEdit(group)} />
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(group.id)} />
                                </View>
                            )}
                        />
                    ))}
                </ScrollView>
            )}
            <FAB icon="plus" style={styles.fab} onPress={handleOpenCreate} label="Add Group" />

            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title>{editingId ? 'Edit Group' : 'New Group'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
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

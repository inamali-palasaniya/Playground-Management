import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, ActivityIndicator, IconButton, Appbar, useTheme } from 'react-native-paper';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '../../../services/api.service';

export default function ExpenseCategoriesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await apiService.request('/api/masters/expense-categories');
            setCategories(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCategories();
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
        Alert.alert('Delete Category', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.request(`/api/masters/expense-categories/${id}`, { method: 'DELETE' });
                        loadCategories();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete category');
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!name) { Alert.alert('Error', 'Name is required'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await apiService.request(`/api/masters/expense-categories/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name })
                });
            } else {
                await apiService.request('/api/masters/expense-categories', {
                    method: 'POST',
                    body: JSON.stringify({ name })
                });
            }

            setVisible(false);
            loadCategories();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: theme.colors.primary }} elevated>
                <Appbar.BackAction onPress={() => router.back()} color="white" />
                <Appbar.Content title="Expense Categories" titleStyle={{ color: 'white' }} />
            </Appbar.Header>

            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {categories.map((cat) => (
                        <List.Item
                            key={cat.id}
                            title={cat.name}
                            left={props => <List.Icon {...props} icon="shape" />}
                            right={props => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton icon="pencil" onPress={() => handleOpenEdit(cat)} />
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(cat.id)} />
                                </View>
                            )}
                            style={styles.item}
                        />
                    ))}
                </ScrollView>
            )}
            <FAB icon="plus" style={styles.fab} onPress={handleOpenCreate} label="Add Category" />

            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title>{editingId ? 'Edit Category' : 'New Category'}</Dialog.Title>
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
    input: { marginBottom: 10, backgroundColor: 'white' },
    item: { backgroundColor: 'white', marginBottom: 1 }
});

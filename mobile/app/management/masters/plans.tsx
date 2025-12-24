import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { List, FAB, Portal, Dialog, TextInput, Button, Checkbox, Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import apiService from '../../../services/api.service';
import AuditLogDialog from '../../components/AuditLogDialog';

export default function PlansScreen() {
    const insets = useSafeAreaInsets();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [auditVisible, setAuditVisible] = useState(false);
    const [auditEntityId, setAuditEntityId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [rateDaily, setRateDaily] = useState('');
    const [rateMonthly, setRateMonthly] = useState('');
    const [isDepositRequired, setIsDepositRequired] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadPlans = async () => {
        setLoading(true);
        try {
            const data = await apiService.getSubscriptionPlans();
            setPlans(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadPlans();
        }, [])
    );

    const handleOpenCreate = () => {
        setEditingId(null);
        setName('');
        setRateDaily('');
        setRateMonthly('');
        setIsDepositRequired(false);
        setVisible(true);
    };

    const handleOpenEdit = (plan: any) => {
        setEditingId(plan.id);
        setName(plan.name);
        setRateDaily(String(plan.rate_daily || 0));
        setRateMonthly(String(plan.rate_monthly || 0));
        setIsDepositRequired(plan.is_deposit_required);
        setVisible(true);
    };

    const handleDelete = (id: number) => {
        Alert.alert('Delete Plan', 'Are you sure?', [
            { text: 'Cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiService.deleteSubscriptionPlan(id);
                        loadPlans();
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
                rate_daily: parseFloat(rateDaily) || 0,
                rate_monthly: parseFloat(rateMonthly) || 0,
                is_deposit_required: isDepositRequired,
                monthly_deposit_part: 0
            };

            if (editingId) {
                await apiService.updateSubscriptionPlan(editingId, payload);
            } else {
                await apiService.createSubscriptionPlan(payload);
            }

            setVisible(false);
            loadPlans();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {plans.map((plan) => (
                        <List.Item
                            key={plan.id}
                            title={plan.name}
                            description={`Monthly: ${plan.rate_monthly}, Daily: ${plan.rate_daily} ${plan.is_deposit_required ? '(Dep Req)' : ''}`}
                            left={props => <List.Icon {...props} icon="file-document-outline" />}
                            right={props => (
                                <View style={{ flexDirection: 'row' }}>
                                    <IconButton icon="history" size={20} iconColor="#607D8B" onPress={() => { setAuditEntityId(plan.id); setAuditVisible(true); }} />
                                    <IconButton icon="pencil" onPress={() => handleOpenEdit(plan)} />
                                    <IconButton icon="delete" iconColor="red" onPress={() => handleDelete(plan.id)} />
                                </View>
                            )}
                        />
                    ))}
                </ScrollView>
            )}
            <FAB icon="plus" style={styles.fab} onPress={handleOpenCreate} label="Add Plan" />

            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)}>
                    <Dialog.Title>{editingId ? 'Edit Plan' : 'New Plan'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput label="Name" value={name} onChangeText={setName} style={styles.input} />
                        <TextInput label="Monthly Rate" value={rateMonthly} onChangeText={setRateMonthly} keyboardType="numeric" style={styles.input} />
                        <TextInput label="Daily Rate" value={rateDaily} onChangeText={setRateDaily} keyboardType="numeric" style={styles.input} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                            <Checkbox status={isDepositRequired ? 'checked' : 'unchecked'} onPress={() => setIsDepositRequired(!isDepositRequired)} />
                            <Text>Deposit Required</Text>
                        </View>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setVisible(false)}>Cancel</Button>
                        <Button onPress={handleSave} loading={saving}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <AuditLogDialog
                visible={auditVisible}
                onDismiss={() => setAuditVisible(false)}
                entityType="PLAN"
                entityId={auditEntityId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    input: { marginBottom: 10, backgroundColor: 'white' }
});

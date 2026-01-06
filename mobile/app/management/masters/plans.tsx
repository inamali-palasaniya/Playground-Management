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
    const [isSplitDeposit, setIsSplitDeposit] = useState(false);
    const [monthlyDepositPart, setMonthlyDepositPart] = useState('');
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
        setIsSplitDeposit(false);
        setMonthlyDepositPart('');
        setVisible(true);
        setVisible(true);
    };

    const handleOpenEdit = (plan: any) => {
        setEditingId(plan.id);
        setName(plan.name);
        setRateDaily(String(plan.rate_daily || 0));
        // Show TOTAL to user (Fee + Deposit)
        setRateMonthly(String((plan.rate_monthly || 0) + (plan.monthly_deposit_part || 0)));
        setIsDepositRequired(plan.is_deposit_required);
        setIsSplitDeposit(!!plan.monthly_deposit_part && plan.monthly_deposit_part > 0);
        setMonthlyDepositPart(String(plan.monthly_deposit_part || ''));
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
            const totalMonthly = parseFloat(rateMonthly) || 0;
            const depositPart = isSplitDeposit ? (parseFloat(monthlyDepositPart) || 0) : 0;

            if (depositPart > totalMonthly) {
                Alert.alert('Error', 'Deposit part cannot be greater than Total Monthly Rate');
                setSaving(false);
                return;
            }

            const payload = {
                name,
                rate_daily: parseFloat(rateDaily) || 0,
                // Send Net Fee to DB (Total - Deposit)
                rate_monthly: totalMonthly - depositPart,
                is_deposit_required: isDepositRequired,
                monthly_deposit_part: depositPart
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
        };


    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {loading ? <ActivityIndicator style={{ marginTop: 20 }} /> : (
                <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
                    {plans.map((plan) => (
                        <List.Item
                            key={plan.id}
                            title={plan.name}
                            // Display Total to user
                            description={`Monthly: ${plan.rate_monthly + (plan.monthly_deposit_part || 0)} ${plan.monthly_deposit_part ? `(Fee: ${plan.rate_monthly} + Dep: ${plan.monthly_deposit_part})` : ''}, Daily: ${plan.rate_daily} ${plan.is_deposit_required ? '(Dep Req)' : ''}`}
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

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                            <Checkbox status={isSplitDeposit ? 'checked' : 'unchecked'} onPress={() => setIsSplitDeposit(!isSplitDeposit)} />
                            <Text>Split Monthly Deposit?</Text>
                        </View>
                        {isSplitDeposit && (
                            <TextInput label="Monthly Deposit Part (e.g. 200)" value={monthlyDepositPart} onChangeText={setMonthlyDepositPart} keyboardType="numeric" style={styles.input} />
                        )}
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

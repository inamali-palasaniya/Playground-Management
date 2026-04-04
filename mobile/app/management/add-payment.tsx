import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, RadioButton, Menu } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import apiService from '../../services/api.service';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

export default function AddPaymentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { linkedChargeId, linkedAmount, linkedType, editId, initialAmount, initialNotes, initialDate, initialType, initialMethod, initialTxType } = params;

    // User/Team Management
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(params.userId ? Number(params.userId) : null);
    const [userMenuVisible, setUserMenuVisible] = useState(false);

    const [teams, setTeams] = useState<any[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(params.teamId ? Number(params.teamId) : null);
    const [teamMenuVisible, setTeamMenuVisible] = useState(false);

    const [tournaments, setTournaments] = useState<any[]>([]);
    const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(params.tournamentId ? Number(params.tournamentId) : null);
    const [tournamentMenuVisible, setTournamentMenuVisible] = useState(false);

    const [payerType, setPayerType] = useState<'USER' | 'TEAM'>(params.teamId ? 'TEAM' : 'USER');

    // Edit Mode Init
    const isEditing = !!editId;

    const [amount, setAmount] = useState<string>(
        isEditing ? (initialAmount ? initialAmount.toString() : '') :
            (linkedAmount ? linkedAmount.toString() : '')
    );
    const [transactionType, setTransactionType] = useState<'CREDIT' | 'DEBIT'>(
        isEditing ? (initialTxType as 'CREDIT' | 'DEBIT' || 'CREDIT') : 'CREDIT'
    );
    const [paymentMethod, setPaymentMethod] = useState(
        isEditing ? (initialMethod as string || 'CASH') : 'CASH'
    );
    const [type, setType] = useState<string>(
        isEditing ? (initialType as string || 'PAYMENT') :
            (params.teamId ? 'TOURNAMENT_FEE' : (linkedType ? linkedType.toString() : 'SUBSCRIPTION'))
    );
    const [notes, setNotes] = useState(
        isEditing ? (initialNotes as string || '') : ''
    );
    const [loading, setLoading] = useState(false);

    // Dates
    const [date, setDate] = useState(
        isEditing && initialDate ? new Date(initialDate as string) : new Date()
    );
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Subscription Billing Period
    const [billingMonth, setBillingMonth] = useState(new Date());
    const [showBillingPicker, setShowBillingPicker] = useState(false);

    const [typeMenuVisible, setTypeMenuVisible] = useState(false);

    const paymentTypes = [
        { label: 'General Payment', value: 'PAYMENT' },
        { label: 'Subscription', value: 'SUBSCRIPTION' },
        { label: 'Donation', value: 'DONATION' },
        { label: 'Deposit', value: 'DEPOSIT' },
        { label: 'Maintenance', value: 'MAINTENANCE' },
        { label: 'Tournament Fee', value: 'TOURNAMENT_FEE' },
    ];

    React.useEffect(() => {
        // Fetch base data
        apiService.getUsers().then(setUsers).catch(console.error);
        apiService.getTournaments().then(setTournaments).catch(console.error);
    }, []);

    React.useEffect(() => {
        if (selectedTournamentId) {
             // Reset team selection when tournament changes, unless it's already set from params payload correctly
            apiService.getTeamsByTournament(selectedTournamentId).then(setTeams).catch(console.error);
        } else {
            setTeams([]);
        }
    }, [selectedTournamentId]);

    React.useEffect(() => {
        if (params.userId) {
            setSelectedUserId(Number(params.userId));
            setPayerType('USER');
        }
        if (params.teamId) {
            setSelectedTeamId(Number(params.teamId));
            setPayerType('TEAM');
        }
        if (params.tournamentId) {
            setSelectedTournamentId(Number(params.tournamentId));
        }
    }, [params.userId, params.teamId, params.tournamentId]);

    const handleSubmit = async () => {
        if (!amount || (payerType === 'USER' && !selectedUserId) || (payerType === 'TEAM' && !selectedTeamId)) {
            Alert.alert('Error', 'Amount and appropriate Payer (User or Team) are required');
            return;
        }

        const proceedWithPayment = async () => {
            setLoading(true);
            try {
                if (isEditing) {
                    await apiService.updateLedgerEntry(Number(editId), {
                        amount: parseFloat(amount),
                        notes: notes,
                        date: date.toISOString(),
                        type: type,
                        payment_method: transactionType === 'CREDIT' ? paymentMethod : undefined,
                        user_id: payerType === 'USER' ? Number(selectedUserId) : null,
                        team_id: payerType === 'TEAM' ? Number(selectedTeamId) : null,
                        tournament_id: (payerType === 'TEAM' && type === 'TOURNAMENT_FEE') ? Number(selectedTournamentId) : null,
                    });
                    Alert.alert('Success', 'Transaction updated successfully');
                } else {
                    await apiService.recordPayment(
                        payerType === 'USER' ? Number(selectedUserId) : null,
                        parseFloat(amount),
                        paymentMethod,
                        notes,
                        type,
                        date.toISOString(),
                        type === 'SUBSCRIPTION' ? format(billingMonth, 'MMMM yyyy') : undefined,
                        linkedChargeId ? parseInt(linkedChargeId as string) : undefined,
                        transactionType,
                        payerType === 'TEAM' ? Number(selectedTeamId) : null,
                        payerType === 'TEAM' && type === 'TOURNAMENT_FEE' ? Number(selectedTournamentId) : null
                    );
                    Alert.alert('Success', 'Payment recorded successfully');
                }
                router.back();
            } catch (error) {
                console.error(error);
                Alert.alert('Error', isEditing ? 'Failed to update' : 'Failed to record payment');
            } finally {
                setLoading(false);
            }
        };

        // Duplicate Check only for NEW items
        if (type === 'SUBSCRIPTION' && !isEditing) {
            try {
                setLoading(true);
                const monthYear = format(billingMonth, 'MMMM yyyy');
                const existing = await apiService.checkSubscriptionPayment(Number(selectedUserId), monthYear);
                setLoading(false);

                if (existing && existing.length > 0) {
                    const details = existing.map((p: any, i: number) => `${i + 1}. ${format(new Date(p.date), 'dd/MM')} - ₹${p.amount}`).join('\n');
                    Alert.alert(
                        'Duplicate Warning',
                        `Found ${existing.length} existing subscription payment(s) for ${monthYear}:\n\n${details}\n\nDo you still want to add this payment?`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Yes, Add Duplicate', onPress: proceedWithPayment }
                        ]
                    );
                    return;
                }
            } catch (e) {
                console.error('Check failed', e);
                setLoading(false);
            }
        }

        proceedWithPayment();
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const handleBillingChange = (event: any, selectedDate?: Date) => {
        setShowBillingPicker(false);
        if (selectedDate) setBillingMonth(selectedDate);
    };

    const getSelectedUserName = () => {
        if (!selectedUserId) return 'Select User';
        // If passed via params, we might have userName, but best to use list if available
        if (users.length > 0) {
            const u = users.find(u => u.id === selectedUserId);
            return u ? u.name : (params.userName as string || 'Unknown User');
        }
        return params.userName as string || 'Loading...';
    };

    return (
        <ScrollView style={styles.container}>
            <Text variant="headlineSmall" style={styles.header}>{isEditing ? 'Edit Transaction' : 'Record Payment'}</Text>

            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Button
                    mode={payerType === 'USER' ? 'contained' : 'outlined'}
                    onPress={() => setPayerType('USER')}
                    style={{ flex: 1, marginRight: 5 }}
                >
                    User
                </Button>
                <Button
                    mode={payerType === 'TEAM' ? 'contained' : 'outlined'}
                    onPress={() => setPayerType('TEAM')}
                    style={{ flex: 1, marginLeft: 5 }}
                >
                    Team
                </Button>
            </View>

            {payerType === 'USER' ? (
                <View style={{ marginBottom: 15 }}>
                    <Text variant="titleMedium" style={styles.label}>User</Text>
                    <Menu
                        visible={userMenuVisible}
                        onDismiss={() => setUserMenuVisible(false)}
                        anchor={
                            <Button mode="outlined" onPress={() => setUserMenuVisible(true)}>
                                {getSelectedUserName()}
                            </Button>
                        }
                    >
                        {users.map(user => (
                            <Menu.Item
                                key={user.id}
                                onPress={() => {
                                    setSelectedUserId(user.id);
                                    setUserMenuVisible(false);
                                }}
                                title={user.name}
                            />
                        ))}
                    </Menu>
                </View>
            ) : (
                <>
                    <View style={{ marginBottom: 15 }}>
                        <Text variant="titleMedium" style={styles.label}>Tournament</Text>
                        <Menu
                            visible={tournamentMenuVisible}
                            onDismiss={() => setTournamentMenuVisible(false)}
                            anchor={
                                <Button mode="outlined" onPress={() => setTournamentMenuVisible(true)}>
                                    {selectedTournamentId ? (tournaments.find(t => t.id === selectedTournamentId)?.name || 'Unknown') : 'Select Tournament'}
                                </Button>
                            }
                        >
                            {tournaments.map(t => (
                                <Menu.Item
                                    key={t.id}
                                    onPress={() => {
                                        setSelectedTournamentId(t.id);
                                        setSelectedTeamId(null); // Reset team selection
                                        setTournamentMenuVisible(false);
                                    }}
                                    title={t.name}
                                />
                            ))}
                        </Menu>
                    </View>

                    {selectedTournamentId && (
                        <View style={{ marginBottom: 15 }}>
                            <Text variant="titleMedium" style={styles.label}>Team</Text>
                            <Menu
                                visible={teamMenuVisible}
                                onDismiss={() => setTeamMenuVisible(false)}
                                anchor={
                                    <Button mode="outlined" onPress={() => setTeamMenuVisible(true)}>
                                        {selectedTeamId ? (teams.find(t => t.id === selectedTeamId)?.name || 'Unknown') : 'Select Team'}
                                    </Button>
                                }
                            >
                                {teams.map(t => (
                                    <Menu.Item
                                        key={t.id}
                                        onPress={() => {
                                            setSelectedTeamId(t.id);
                                            setType('TOURNAMENT_FEE'); // Auto-select tournament fee
                                            setTeamMenuVisible(false);
                                        }}
                                        title={t.name}
                                    />
                                ))}
                            </Menu>
                        </View>
                    )}
                </>
            )}

            <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                <Button
                    mode={transactionType === 'CREDIT' ? 'contained' : 'outlined'}
                    onPress={() => setTransactionType('CREDIT')}
                    style={{ flex: 1, marginRight: 5, backgroundColor: transactionType === 'CREDIT' ? '#4caf50' : undefined }}
                >
                    Receive Payment
                </Button>
                <Button
                    mode={transactionType === 'DEBIT' ? 'contained' : 'outlined'}
                    onPress={() => setTransactionType('DEBIT')}
                    style={{ flex: 1, marginLeft: 5, backgroundColor: transactionType === 'DEBIT' ? '#f44336' : undefined }}
                >
                    Add Charge (Unpaid)
                </Button>
            </View>

            <TextInput
                label="Amount *"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Affix text="₹" />}
            />

            {/* Payment Type Dropdown */}
            <View style={{ marginBottom: 15 }}>
                <Text variant="titleMedium" style={styles.label}>{transactionType === 'DEBIT' ? 'Charge Type' : 'Payment Type'}</Text>
                <Menu
                    visible={typeMenuVisible}
                    onDismiss={() => setTypeMenuVisible(false)}
                    anchor={
                        <Button mode="outlined" onPress={() => setTypeMenuVisible(true)}>
                            {paymentTypes.find(t => t.value === type)?.label || type}
                        </Button>
                    }
                >
                    {paymentTypes.map(t => (
                        <Menu.Item
                            key={t.value}
                            onPress={() => {
                                setType(t.value);
                                setTypeMenuVisible(false);
                            }}
                            title={t.label}
                        />
                    ))}
                </Menu>
            </View>

            {/* Subscription Billing Month */}
            {type === 'SUBSCRIPTION' && (
                <View style={{ marginBottom: 15 }}>
                    <Text variant="titleMedium" style={styles.label}>Billing Month</Text>
                    <Button mode="outlined" onPress={() => setShowBillingPicker(true)}>
                        {format(billingMonth, 'MMMM yyyy')}
                    </Button>
                    {showBillingPicker && (
                        <DateTimePicker
                            value={billingMonth}
                            mode="date"
                            display="default"
                            onChange={handleBillingChange}
                        />
                    )}
                </View>
            )}

            <View style={{ marginBottom: 15 }}>
                <Text variant="titleMedium" style={styles.label}>Payment Date</Text>
                <Button mode="outlined" onPress={() => setShowDatePicker(true)}>
                    {format(date, 'dd MMM yyyy')}
                </Button>
                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                    />
                )}
            </View>

            {/* Payment Method - Only for Credits */}
            {transactionType === 'CREDIT' && (
                <>
                    <Text variant="titleMedium" style={styles.label}>Payment Method</Text>
                    <RadioButton.Group onValueChange={setPaymentMethod} value={paymentMethod}>
                        <View style={styles.radioRow}>
                            <RadioButton.Item label="Cash" value="CASH" />
                            <RadioButton.Item label="Online / UPI" value="ONLINE" />
                        </View>
                    </RadioButton.Group>
                </>
            )}

            <TextInput label="Notes" value={notes} onChangeText={setNotes} style={styles.input} multiline />

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={styles.button}>
                {isEditing ? 'Update ' + (transactionType === 'DEBIT' ? 'Charge' : 'Payment') : (transactionType === 'DEBIT' ? 'Record Charge' : 'Record Payment')}
            </Button>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#fff' },
    header: { marginBottom: 10, textAlign: 'center' },
    input: { marginBottom: 15, backgroundColor: '#fff' },
    label: { marginBottom: 5, marginTop: 10 },
    radioRow: { flexDirection: 'row' },
    button: { marginTop: 20, paddingVertical: 6 }
});

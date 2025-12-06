import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Switch, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function AddEditPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [rateDaily, setRateDaily] = useState('');
  const [rateMonthly, setRateMonthly] = useState('');
  const [depositRequired, setDepositRequired] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlan();
    }
  }, [id]);

  const loadPlan = async () => {
    try {
      const plan = await apiService.getSubscriptionPlanById(Number(id));
      setName(plan.name);
      setRateDaily(plan.rate_daily?.toString() || '');
      setRateMonthly(plan.rate_monthly?.toString() || '');
      setDepositRequired(plan.is_deposit_required);
    } catch (error) {
      Alert.alert('Error', 'Failed to load plan');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }

    if (!rateDaily && !rateMonthly) {
      Alert.alert('Error', 'Either daily or monthly rate is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        rate_daily: rateDaily ? parseFloat(rateDaily) : null,
        rate_monthly: rateMonthly ? parseFloat(rateMonthly) : null,
        is_deposit_required: depositRequired,
      };

      if (id) {
        await apiService.updateSubscriptionPlan(Number(id), data);
        Alert.alert('Success', 'Plan updated successfully');
      } else {
        await apiService.createSubscriptionPlan(data);
        Alert.alert('Success', 'Plan created successfully');
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to ${id ? 'update' : 'create'} plan`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text variant="headlineSmall" style={styles.title}>
          {id ? 'Edit Plan' : 'Create Subscription Plan'}
        </Text>

        <TextInput
          label="Plan Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Daily Rate (₹)"
          value={rateDaily}
          onChangeText={setRateDaily}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Monthly Rate (₹)"
          value={rateMonthly}
          onChangeText={setRateMonthly}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.switchContainer}>
          <Text>Deposit Required</Text>
          <Switch value={depositRequired} onValueChange={setDepositRequired} />
        </View>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {id ? 'Update Plan' : 'Create Plan'}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
  title: { marginBottom: 20 },
  input: { marginBottom: 15 },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
  },
  button: { marginTop: 10 },
});

import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function AddEditFineRuleScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [firstTimeFine, setFirstTimeFine] = useState('');
  const [multiplier, setMultiplier] = useState('');

  useEffect(() => {
    if (id) {
      loadRule();
    }
  }, [id]);

  const loadRule = async () => {
    try {
      const rule = await apiService.getFineRuleById(Number(id));
      setName(rule.name);
      setFirstTimeFine(rule.first_time_fine.toString());
      setMultiplier(rule.subsequent_multiplier.toString());
    } catch (error) {
      Alert.alert('Error', 'Failed to load rule');
    }
  };

  const getEscalationPreview = () => {
    const first = parseFloat(firstTimeFine) || 0;
    const mult = parseFloat(multiplier) || 1;
    const second = first * mult;
    const third = first * Math.pow(mult, 2);
    return `1st: ₹${first} → 2nd: ₹${second} → 3rd: ₹${third}`;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !firstTimeFine) {
      Alert.alert('Error', 'Name and first time fine are required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        first_time_fine: parseFloat(firstTimeFine),
        subsequent_multiplier: multiplier ? parseFloat(multiplier) : 1,
      };

      if (id) {
        await apiService.updateFineRule(Number(id), data);
        Alert.alert('Success', 'Rule updated successfully');
      } else {
        await apiService.createFineRule(data);
        Alert.alert('Success', 'Rule created successfully');
      }
      router.back();
    } catch (error) {
      Alert.alert('Error', `Failed to ${id ? 'update' : 'create'} rule`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text variant="headlineSmall" style={styles.title}>
          {id ? 'Edit Fine Rule' : 'Create Fine Rule'}
        </Text>

        <TextInput
          label="Rule Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          placeholder="e.g., Smoking, Late Arrival"
        />

        <TextInput
          label="First Time Fine (₹)"
          value={firstTimeFine}
          onChangeText={setFirstTimeFine}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Subsequent Multiplier"
          value={multiplier}
          onChangeText={setMultiplier}
          keyboardType="numeric"
          mode="outlined"
          style={styles.input}
          placeholder="e.g., 2 for 2x, 10 for 10x"
        />

        {firstTimeFine && multiplier && (
          <View style={styles.preview}>
            <Text variant="titleSmall">Escalation Preview:</Text>
            <Text variant="bodyMedium" style={styles.previewText}>
              {getEscalationPreview()}
            </Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {id ? 'Update Rule' : 'Create Rule'}
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
  preview: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 20,
  },
  previewText: { marginTop: 5, color: '#2196F3' },
  button: { marginTop: 10 },
});

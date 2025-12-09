import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Card, Chip, Menu } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import apiService from '../../../services/api.service';

export default function ApplyFineScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRule, setSelectedRule] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [finePreview, setFinePreview] = useState<any>(null);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [ruleMenuVisible, setRuleMenuVisible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedUser && selectedRule) {
      calculateFinePreview();
    }
  }, [selectedUser, selectedRule]);

  const fetchData = async () => {
    try {
      const [usersData, rulesData] = await Promise.all([
        apiService.getUsers(),
        apiService.getFineRules(),
      ]);
      setUsers(usersData);
      setRules(rulesData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateFinePreview = async () => {
    if (!selectedUser || !selectedRule) return;

    try {
      const rule = rules.find(r => r.id === selectedRule);
      if (!rule) return;

      const userFines = await apiService.getUserFines(selectedUser);
      // Ensure we count previous occurrences correctly
      const previousOccurrences = userFines.filter((f: any) => f.rule_id === selectedRule).length;
      const occurrence = previousOccurrences + 1;

      let amount: number;
      if (occurrence === 1) {
        amount = Number(rule.first_time_fine);
      } else {
        const multiplier = Number(rule.subsequent_multiplier) || 1;
        amount = Number(rule.first_time_fine) * Math.pow(multiplier, occurrence - 1);
      }

      if (isNaN(amount)) {
        console.error("Calculated amount is NaN", { rule, occurrence });
        amount = 0;
      }

      setFinePreview({ occurrence, amount, rule });
    } catch (error) {
      console.error('Failed to calculate preview:', error);
    }
  };

  const handleApplyFine = async () => {
    if (!selectedUser || !selectedRule) {
      Alert.alert('Error', 'Please select both user and fine rule');
      return;
    }

    Alert.alert(
      'Confirm Fine',
      `Apply fine of ₹${finePreview?.amount} to ${users.find(u => u.id === selectedUser)?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplying(true);
            try {
              await apiService.applyFine(selectedUser, selectedRule);
              Alert.alert('Success', 'Fine applied successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to apply fine');
            } finally {
              setApplying(false);
            }
          },
        },
      ]
    );
  };

  const getSelectedUserName = () => {
    const user = users.find(u => u.id === selectedUser);
    return user ? user.name : 'Select a user...';
  };

  const getSelectedRuleName = () => {
    const rule = rules.find(r => r.id === selectedRule);
    return rule ? rule.name : 'Select a rule...';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text variant="headlineSmall" style={styles.title}>Apply Fine</Text>

        <Text variant="titleMedium" style={styles.label}>Select User</Text>
        <Menu
          visible={userMenuVisible}
          onDismiss={() => setUserMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setUserMenuVisible(true)}
              style={styles.menuButton}
              contentStyle={styles.menuButtonContent}
            >
              {getSelectedUserName()}
            </Button>
          }
        >
          {users.map(user => (
            <Menu.Item
              key={user.id}
              onPress={() => {
                setSelectedUser(user.id);
                setUserMenuVisible(false);
              }}
              title={user.name}
            />
          ))}
        </Menu>

        <Text variant="titleMedium" style={styles.label}>Select Fine Rule</Text>
        <Menu
          visible={ruleMenuVisible}
          onDismiss={() => setRuleMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setRuleMenuVisible(true)}
              style={styles.menuButton}
              contentStyle={styles.menuButtonContent}
            >
              {getSelectedRuleName()}
            </Button>
          }
        >
          {rules.map(rule => (
            <Menu.Item
              key={rule.id}
              onPress={() => {
                setSelectedRule(rule.id);
                setRuleMenuVisible(false);
              }}
              title={rule.name}
            />
          ))}
        </Menu>

        {finePreview && (
          <Card style={styles.previewCard}>
            <Card.Content>
              <Text variant="titleMedium">Fine Details</Text>
              <View style={styles.detailsRow}>
                <Chip icon="alert">Occurrence: {finePreview.occurrence}</Chip>
                <Chip icon="cash">Amount: ₹{finePreview.amount}</Chip>
              </View>
              <Text variant="bodySmall" style={styles.ruleInfo}>
                Rule: {finePreview.rule.name} (₹{finePreview.rule.first_time_fine} × {finePreview.rule.subsequent_multiplier}x)
              </Text>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleApplyFine}
          loading={applying}
          disabled={!selectedUser || !selectedRule || applying || !finePreview}
          style={styles.button}
        >
          Apply Fine
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  form: { padding: 20 },
  title: { marginBottom: 20 },
  label: { marginTop: 10, marginBottom: 5 },
  menuButton: { marginBottom: 15 },
  menuButtonContent: { justifyContent: 'flex-start' },
  previewCard: { marginVertical: 20, backgroundColor: '#E3F2FD' },
  detailsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ruleInfo: { marginTop: 10, color: '#666' },
  button: { marginTop: 20 },
});

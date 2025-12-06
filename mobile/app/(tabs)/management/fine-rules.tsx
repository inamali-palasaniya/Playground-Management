import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function FineRulesScreen() {
  const router = useRouter();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRules = async () => {
    try {
      const data = await apiService.getFineRules();
      setRules(data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
      Alert.alert('Error', 'Failed to load fine rules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this fine rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteFineRule(id);
              Alert.alert('Success', 'Rule deleted successfully');
              fetchRules();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const getEscalationPreview = (rule: any) => {
    const first = rule.first_time_fine;
    const second = first * rule.subsequent_multiplier;
    const third = first * Math.pow(rule.subsequent_multiplier, 2);
    return `₹${first} → ₹${second} → ₹${third}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={rules}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRules(); }} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge">{item.name}</Text>
              <View style={styles.detailsRow}>
                <Chip icon="cash">1st: ₹{item.first_time_fine}</Chip>
                <Chip icon="trending-up">{item.subsequent_multiplier}x</Chip>
              </View>
              <Text variant="bodySmall" style={styles.preview}>
                Escalation: {getEscalationPreview(item)}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => router.push(`/management/add-fine-rule?id=${item.id}`)}>Edit</Button>
              <Button textColor="red" onPress={() => handleDelete(item.id)}>Delete</Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No fine rules found</Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/management/add-fine-rule')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 10 },
  detailsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  preview: { marginTop: 8, color: '#666' },
  empty: { padding: 20, alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

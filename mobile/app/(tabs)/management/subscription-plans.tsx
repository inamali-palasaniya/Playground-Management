import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlans = async () => {
    try {
      const data = await apiService.getSubscriptionPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      Alert.alert('Error', 'Failed to load subscription plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteSubscriptionPlan(id);
              Alert.alert('Success', 'Plan deleted successfully');
              fetchPlans();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
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
        data={plans}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPlans(); }} />
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge">{item.name}</Text>
              <View style={styles.rateContainer}>
                {item.rate_daily && (
                  <Chip icon="calendar-today">Daily: ₹{item.rate_daily}</Chip>
                )}
                {item.rate_monthly && (
                  <Chip icon="calendar-month">Monthly: ₹{item.rate_monthly}</Chip>
                )}
              </View>
              {item.is_deposit_required && (
                <Chip icon="cash" style={styles.depositChip}>Deposit Required</Chip>
              )}
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => router.push(`/management/edit-plan?id=${item.id}`)}>Edit</Button>
              <Button textColor="red" onPress={() => handleDelete(item.id)}>Delete</Button>
            </Card.Actions>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No subscription plans found</Text>
          </View>
        }
      />
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/management/add-plan')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { margin: 10 },
  rateContainer: { flexDirection: 'row', gap: 8, marginTop: 8 },
  depositChip: { marginTop: 8, alignSelf: 'flex-start' },
  empty: { padding: 20, alignItems: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});

import { View, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Card, Button, Searchbar, FAB, ActivityIndicator, Chip } from 'react-native-paper';
import { useState, useEffect } from 'react';
import apiService from '../../../services/api.service';

export default function AttendanceScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const [usersData, attendanceData] = await Promise.all([
        apiService.getUsers(),
        apiService.getAttendanceByDate(today),
      ]);
      setUsers(usersData);
      setTodayAttendance(attendanceData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (userId: number) => {
    try {
      await apiService.checkIn(userId);
      Alert.alert('Success', 'Check-in successful');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in');
    }
  };

  const isCheckedIn = (userId: number) => {
    return todayAttendance.some(a => a.user_id === userId);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone.includes(searchQuery)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleLarge">Today's Attendance</Text>
          <Text variant="headlineMedium">{todayAttendance.length} / {users.length}</Text>
          <Text variant="bodyMedium">{today}</Text>
        </Card.Content>
      </Card>

      <Searchbar
        placeholder="Search users..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
        renderItem={({ item }) => {
          const checkedIn = isCheckedIn(item.id);
          return (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text variant="titleMedium">{item.name}</Text>
                    <Text variant="bodySmall">{item.phone}</Text>
                  </View>
                  {checkedIn ? (
                    <Chip icon="check" mode="flat" style={styles.checkedInChip}>
                      Checked In
                    </Chip>
                  ) : (
                    <Button mode="contained" onPress={() => handleCheckIn(item.id)}>
                      Check In
                    </Button>
                  )}
                </View>
              </Card.Content>
            </Card>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { margin: 10, backgroundColor: '#4CAF50' },
  searchbar: { margin: 10 },
  card: { margin: 10, marginTop: 0 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flex: 1 },
  checkedInChip: { backgroundColor: '#E8F5E9' },
  empty: { padding: 20, alignItems: 'center' },
});

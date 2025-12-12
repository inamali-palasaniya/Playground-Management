import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Card, List, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import apiService from '../../services/api.service';
import { useFocusEffect } from '@react-navigation/native';

export default function FineRulesScreen() {
    const router = useRouter();
    const [rules, setRules] = useState<any[]>([]);

    const loadRules = async () => {
        try {
            const data = await apiService.getFineRules();
            setRules(data);
        } catch (error) {
            console.error('Failed to load rules', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRules();
        }, [])
    );

    const handleDelete = (id: number) => {
        Alert.alert('Delete Rule', 'Are you sure?', [
            { text: 'Cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                    try {
                        // Assuming API has delete method, if not, we need to add it or just hide it
                        // await apiService.deleteFineRule(id);
                        Alert.alert('Info', 'Delete Implementation Pending on Backend');
                    } catch (e) { Alert.alert('Error', 'Failed to delete'); }
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={rules}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <Card.Content>
                             <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                                <View>
                                    <Text variant="titleMedium">{item.name}</Text>
                                    <Text variant="bodyMedium">First: ₹{item.first_time_fine}</Text>
                                    <Text variant="bodySmall" style={{color:'gray'}}>Subsequent: ₹{item.subsequent_fine}</Text>
                                </View>
                                {/* <IconButton icon="delete" onPress={() => handleDelete(item.id)} /> */}
                             </View>
                        </Card.Content>
                    </Card>
                )}
            />
            <FAB
                icon="plus"
                style={styles.fab}
                label="Add Rule"
                onPress={() => router.push('/management/add-fine-rule')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 10 },
    card: { marginBottom: 10 },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    }
});

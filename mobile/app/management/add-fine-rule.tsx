import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import apiService from '../../services/api.service';

export default function AddFineRuleScreen() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [firstFine, setFirstFine] = useState('');
    const [subsequentFine, setSubsequentFine] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !firstFine) {
            Alert.alert('Error', 'Name and First Time Fine are required');
            return;
        }

        setLoading(true);
        try {
            await apiService.createFineRule({
                name,
                first_time_fine: parseFloat(firstFine),
                subsequent_fine: subsequentFine ? parseFloat(subsequentFine) : parseFloat(firstFine)
            });
            Alert.alert('Success', 'Fine Rule Created');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to create rule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineSmall" style={{marginBottom: 20, textAlign:'center'}}>New Fine Rule</Text>
            
            <TextInput label="Rule Name (e.g. Smoking)" value={name} onChangeText={setName} style={styles.input} />
            <TextInput label="First Time Amount (₹)" value={firstFine} onChangeText={setFirstFine} keyboardType="numeric" style={styles.input} />
            <TextInput label="Subsequent Amount (₹) (Optional)" value={subsequentFine} onChangeText={setSubsequentFine} keyboardType="numeric" style={styles.input} />

            <Button mode="contained" onPress={handleSubmit} loading={loading} style={{marginTop: 10}}>
                Create Rule
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' },
    input: { marginBottom: 15, backgroundColor: 'white' }
});

import { AuthService } from '../../services/auth.service';
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, useTheme, IconButton, TextInput, ActivityIndicator, Divider } from 'react-native-paper';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import apiService from '../../services/api.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AttendanceScreen() {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [attendanceToday, setAttendanceToday] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [punchMode, setPunchMode] = useState<'IN' | 'OUT'>('IN');
    const [remarks, setRemarks] = useState('');

    // Date/Time State
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const userData = await AuthService.getUser();
            if (!userData) {
                console.log("No user data found");
                return;
            }
            // Fetch today's attendance for user
            // Ideally backend has endpoint /attendance/today
            // For now, assuming we handle state locally or fetch recent
            // Note: Real user would likely use /attendance/user/:id?date=today
            const result: any = await apiService.request(`/api/attendance/user/${userData.id}?limit=1`);
            // Check if result is today
            if (result && result.length > 0) {
                const lastRecord = result[0];
                const recordDate = new Date(lastRecord.date).toDateString();
                const todayStr = new Date().toDateString();
                if (recordDate === todayStr) {
                    setAttendanceToday(lastRecord);
                } else {
                    setAttendanceToday(null);
                }
            }
        } catch (e) {
            console.log('Error loading attendance', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadAttendance();
        }, [])
    );

    const openPunchModal = (mode: 'IN' | 'OUT') => {
        setPunchMode(mode);
        setModalVisible(true);
        setDate(new Date());
        setTime(new Date());
    };

    const handlePunchSubmit = async () => {
        setLoading(true);
        // Combine date and time
        const punchDateTime = new Date(date);
        punchDateTime.setHours(time.getHours());
        punchDateTime.setMinutes(time.getMinutes());

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            let location = null;
            if (status === 'granted') {
                location = await Location.getCurrentPositionAsync({});
            }

            const endpoint = punchMode === 'IN' ? '/api/attendance/check-in' : '/api/attendance/check-out';
            const userData = await AuthService.getUser();

            await apiService.request(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userData?.id,
                    lat: location?.coords.latitude,
                    lng: location?.coords.longitude,
                    // Sending manual time if backend supports override, otherwise it uses server time
                    // Ideally pass `manual_timestamp: punchDateTime`
                    notes: remarks
                })
            });

            Alert.alert('Success', `Punched ${punchMode} Successfully`);
            setModalVisible(false);
            loadAttendance();
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Punch failed');
        } finally {
            setLoading(false);
        }
    };

    // ... rest of the component
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Attendance</Text>
                <Text variant="bodyLarge" style={{ color: 'gray' }}>{format(new Date(), 'EEEE • dd-MM-yyyy')}</Text>
            </View>

            {/* Day Wise Summary Card */}
            <Card style={styles.summaryCard}>
                <Card.Content>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text variant="titleMedium">Day Wise Summary</Text>
                        {attendanceToday?.daily_fee_charged > 0 && (
                            <Text style={{ color: 'red', fontWeight: 'bold' }}>-₹{attendanceToday.daily_fee_charged}</Text>
                        )}
                    </View>
                    <Divider style={{ marginVertical: 10 }} />

                    {attendanceToday ? (
                        <View style={styles.punchRow}>
                            <View>
                                <Text variant="labelMedium" style={{ color: 'green' }}>PUNCH IN</Text>
                                <Text variant="titleLarge">{attendanceToday.in_time ? format(new Date(attendanceToday.in_time), 'hh:mm a') : '--:--'}</Text>
                            </View>
                            <MaterialCommunityIcons name="arrow-right" size={24} color="#ccc" />
                            <View>
                                <Text variant="labelMedium" style={{ color: 'red' }}>PUNCH OUT</Text>
                                <Text variant="titleLarge">{attendanceToday.out_time ? format(new Date(attendanceToday.out_time), 'hh:mm a') : '--:--'}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ textAlign: 'center', padding: 20, color: 'gray' }}>No punch record for today.</Text>
                    )}

                    <View style={styles.actionRow}>
                        {(!attendanceToday || !attendanceToday.in_time) && (
                            <Button mode="contained" buttonColor="green" icon="login" onPress={() => openPunchModal('IN')} style={{ flex: 1, marginRight: 5 }}>
                                Punch IN
                            </Button>
                        )}
                        {(attendanceToday && attendanceToday.in_time && !attendanceToday.out_time) && (
                            <Button mode="contained" buttonColor="red" icon="logout" onPress={() => openPunchModal('OUT')} style={{ flex: 1, marginLeft: 5 }}>
                                Punch OUT
                            </Button>
                        )}
                    </View>
                </Card.Content>
            </Card>

            {/* Punch Modal */}
            <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text variant="titleLarge">Set Punch {punchMode}</Text>
                            <IconButton icon="close" onPress={() => setModalVisible(false)} />
                        </View>

                        <Text style={styles.label}>Date *</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputBox}>
                            <Text>{format(date, 'dd/MM/yyyy')}</Text>
                            <MaterialCommunityIcons name="calendar" size={20} color="gray" />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker value={date} mode="date" onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
                        )}

                        <Text style={styles.label}>Time *</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.inputBox}>
                            <Text>{format(time, 'hh:mm a')}</Text>
                            <MaterialCommunityIcons name="clock" size={20} color="gray" />
                        </TouchableOpacity>
                        {showTimePicker && (
                            <DateTimePicker value={time} mode="time" onChange={(e, d) => { setShowTimePicker(false); if (d) setTime(d); }} />
                        )}

                        <TextInput
                            mode="outlined"
                            label="Remarks"
                            value={remarks}
                            onChangeText={setRemarks}
                            style={{ marginTop: 10, backgroundColor: 'white' }}
                        />

                        <Button mode="contained" onPress={handlePunchSubmit} loading={loading} style={{ marginTop: 20, borderRadius: 8 }}>
                            Save
                        </Button>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
    header: { marginBottom: 20 },
    summaryCard: { backgroundColor: 'white', borderRadius: 12, elevation: 2 },
    punchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    actionRow: { flexDirection: 'row', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    label: { marginTop: 10, marginBottom: 5, fontWeight: 'bold' },
    inputBox: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});

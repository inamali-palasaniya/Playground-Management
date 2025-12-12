import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Button, ActivityIndicator } from 'react-native-paper';
import { AuthService } from '../services/auth.service';
import apiService from '../services/api.service';
import { useRouter } from 'expo-router';

export default function HeaderProfile() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [status, setStatus] = useState<'IN' | 'OUT' | 'NONE'>('NONE');
    const [loading, setLoading] = useState(false);

    const loadProfile = async () => {
        const u = await AuthService.getUser();
        if (u) {
            setUser(u);
            checkStatus(u.id);
        }
    };

    const checkStatus = async (id: number) => {
        // Needs a way to get *my* specific attendance today. 
        // We can use the generic getUsers? No, that returns everyone.
        // We can use getUserAttendance? It returns list.
        // Let's fetch summary or todays date.
        try {
            const today = new Date().toISOString().split('T')[0];
            const attendance = await apiService.request(`/api/attendance/date/${today}?user_id=${id}`);
            // This endpoint returns *all* users for date, need filter?
            // Actually `getAttendanceByDate` in controller returns `attendance` associated with that date. 
            // Better: use getAttendanceSummary or just rely on global punch state if we had it.
            // Let's implement a quick check.
            
            // Re-use the data logic from user list if possible? 
            // For now, let's just use getUserById which typically has includes if we modify it, 
            // OR use /api/attendance/user/:id and find today.
            const atts = await apiService.getUserAttendance(id);
            const todayRecord = atts.find((a: any) => 
                new Date(a.date).toISOString().split('T')[0] === today
            );
            
            if (todayRecord) {
                if (todayRecord.out_time) setStatus('OUT');
                else setStatus('IN');
            } else {
                setStatus('NONE');
            }
        } catch (e) {
            console.log('Status check failed', e);
        }
    };

    const handlePunch = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (status === 'IN') {
                await apiService.checkOut(user.id);
                setStatus('OUT');
            } else {
                await apiService.checkIn(user.id, new Date().toISOString());
                setStatus('IN');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    if (!user) return <View />;

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => router.push('/profile')}>
                <Avatar.Text size={35} label={user.name.substring(0, 2).toUpperCase()} style={{backgroundColor: '#6200ee'}} />
            </TouchableOpacity>
            <View style={styles.info}>
                <Text variant="labelLarge" style={{fontWeight: 'bold', fontSize: 13}}>{user.name}</Text>
                <Text variant="labelSmall" style={{color: 'gray', fontSize: 10}}>{user.role}</Text>
            </View>
            <Button 
                mode="contained" 
                compact 
                onPress={handlePunch} 
                loading={loading}
                buttonColor={status === 'IN' ? '#FF5252' : '#4CAF50'}
                labelStyle={{fontSize: 10, marginHorizontal: 8, marginVertical: 4}}
                style={{height: 28, justifyContent:'center', marginLeft: 8}}
            >
                {status === 'IN' ? 'OUT' : 'IN'}
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingBottom: 5 // Adjust for header height
    },
    info: {
        marginLeft: 8,
    }
});

import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import PointsTable from './PointsTable';
import Leaderboard from './Leaderboard';

export default function AnalyticsScreen() {
    const { tournamentId } = useLocalSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'points' | 'stats'>('points');
    const theme = useTheme();

    return (
        <SafeAreaView style={styles.container}>
            <Appbar.Header style={{ backgroundColor: 'white' }}>
                <Appbar.BackAction onPress={() => router.canGoBack() ? router.back() : router.replace('/management/cricket/tournaments')} />
                <Appbar.Content title="Tournament Analytics" titleStyle={{ fontWeight: 'bold' }} />
            </Appbar.Header>
            
            <View style={styles.tabBar}>
                <TabButton 
                    title="Points Table" 
                    active={activeTab === 'points'} 
                    onPress={() => setActiveTab('points')} 
                    color={theme.colors.primary}
                />
                <TabButton 
                    title="Leaderboard" 
                    active={activeTab === 'stats'} 
                    onPress={() => setActiveTab('stats')} 
                    color={theme.colors.primary}
                />
            </View>

            <View style={styles.content}>
                {activeTab === 'points' ? <PointsTable /> : <Leaderboard />}
            </View>
        </SafeAreaView>
    );
}

const TabButton = ({ title, active, onPress, color }: any) => (
    <View style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 3 }]}>
        <Text onPress={onPress} style={[styles.tabText, { color: active ? color : 'gray', fontWeight: active ? 'bold' : 'normal' }]}>
            {title}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2, backgroundColor: 'white' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 16 },
    content: { flex: 1 }
});

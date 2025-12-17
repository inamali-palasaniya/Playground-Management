import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';


// Local Components (Importing them directly or definition inline if simple, but better to import)
// Since I created them as files, I'll import them.
// Note: Material Top Tabs requires navigation container context usually, but in Expo Router we can just use simple state switching for simplicity if avoiding extra dependencies.
// Let's use simple state switching for 'Tabs' to avoid complex nav setup for this sub-screen.

import PointsTable from './PointsTable';
import Leaderboard from './Leaderboard';

export default function AnalyticsScreen() {
    const { tournamentId } = useLocalSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'points' | 'stats'>('points');
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: 'Tournament Analytics' }} />
            
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
        </View>
    );
}

const TabButton = ({ title, active, onPress, color }: any) => (
    <View style={[styles.tab, active && { borderBottomColor: color, borderBottomWidth: 3 }]}>
        <Text onPress={onPress} style={[styles.tabText, { color: active ? color : 'gray', fontWeight: active ? 'bold' : 'normal' }]}>
            {title}
        </Text>
    </View>
);

import { Text, TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 2, backgroundColor: 'white' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 16 },
    content: { flex: 1 }
});

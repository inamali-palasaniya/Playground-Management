import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#6200ee' }}>
            <Tabs.Screen
                name="management"
                options={{
                    title: 'Management',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="office-building" size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="scoring"
                options={{
                    title: 'Scoring',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cricket" size={24} color={color} />,
                }}
            />
        </Tabs>
    );
}

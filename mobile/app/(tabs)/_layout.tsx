import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabLayout() {
    const router = useRouter();

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#6200ee' }}>
            <Tabs.Screen
                name="management"
                options={{
                    title: 'Management',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="office-building" size={24} color={color} />,
                    headerLeft: () => (
                        <MaterialCommunityIcons
                            name="account-circle"
                            size={28}
                            color="black"
                            style={{ marginLeft: 16 }}
                            onPress={() => router.push('/profile')}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={24} color={color} />,
                    headerShown: false,
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

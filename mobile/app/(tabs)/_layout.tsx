import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HeaderProfile from '../../components/HeaderProfile';

export default function TabLayout() {
    const router = useRouter();

    return (
        <Tabs screenOptions={{ tabBarActiveTintColor: '#6200ee' }}>
            <Tabs.Screen
                name="management"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-variant" size={24} color={color} />,
                    headerTitle: () => <HeaderProfile />,
                    headerLeft: () => null,
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

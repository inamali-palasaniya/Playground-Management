import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import HeaderProfile from '../../components/HeaderProfile';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/auth.service';

export default function TabLayout() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const canViewUsers = AuthService.hasPermission(user, 'user', 'view');
    const canViewScoring = AuthService.hasPermission(user, 'cricket_scoring', 'view');

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            tabBarShowLabel: false,
            tabBarStyle: {
                borderTopWidth: 1,
                borderTopColor: '#f0f0f0',
                backgroundColor: 'white',
                height: 60 + (Platform.OS === 'ios' ? insets.bottom : 0),
                ...styles.shadow,
            }
        }}>
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    href: canViewUsers ? '/(tabs)/users' : null,
                    tabBarIcon: ({ color, size }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="account-group" size={28} color={color} />
                        </View>
                    ),
                    headerShown: false,
                }}
            />

            <Tabs.Screen
                name="dashboard/index"
                options={{
                    title: 'Dashboard',
                    headerShown: false,
                    tabBarIcon: ({ focused }) => (
                        // Custom Floating Button with Curve Effect
                        <View style={{
                            top: -15, // Reduced offset for relative bar
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <View style={{
                                width: 62,
                                height: 62,
                                borderRadius: 31,
                                backgroundColor: theme.colors.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                ...styles.shadow,
                                borderWidth: 4,
                                borderColor: 'white'
                            }}>
                                <MaterialCommunityIcons name="view-dashboard-outline" size={28} color="white" />
                            </View>
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="scoring"
                options={{
                    title: 'Scoring',
                    href: canViewScoring ? '/(tabs)/scoring' : null,
                    tabBarIcon: ({ color, size }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <MaterialCommunityIcons name="cricket" size={28} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    shadow: {
        shadowColor: '#7F5DF0',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5,
    }
});

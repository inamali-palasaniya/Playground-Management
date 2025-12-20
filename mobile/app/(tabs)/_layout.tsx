import { Tabs, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import HeaderProfile from '../../components/HeaderProfile';
import { useTheme } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
    const router = useRouter();
    const theme = useTheme();
    const { user } = useAuth();

    const isNormalUser = user?.role === 'NORMAL';

    return (
        <Tabs screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            tabBarShowLabel: false,
            tabBarStyle: {
                position: 'absolute',
                borderTopWidth: 0,
                // elevation: 10, // Removed to avoid duplicate with styles.shadow
                backgroundColor: 'white',
                height: 70,
                ...styles.shadow
            }
        }}>
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    href: isNormalUser ? null : '/(tabs)/users',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center', top: 15 }}>
                            <MaterialCommunityIcons name="account-group" size={30} color={color} />
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
                            top: -25, // Adjusted for docked bar
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                            <View style={{
                                width: 70,
                                height: 70,
                                borderRadius: 35,
                                backgroundColor: theme.colors.primary,
                                justifyContent: 'center',
                                alignItems: 'center',
                                ...styles.shadow,
                                borderWidth: 5, // Thicker border
                                borderColor: 'white' // Match bar background to simulate seamless curve
                            }}>
                                <MaterialCommunityIcons name="view-dashboard-outline" size={32} color="white" />
                            </View>
                        </View>
                    ),
                }}
            />

            <Tabs.Screen
                name="scoring"
                options={{
                    title: 'Scoring',
                    tabBarIcon: ({ color, size }) => (
                        <View style={{ alignItems: 'center', justifyContent: 'center', top: 15 }}>
                            <MaterialCommunityIcons name="cricket" size={30} color={color} />
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

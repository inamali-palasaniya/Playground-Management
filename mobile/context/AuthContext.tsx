
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService, User } from '../services/auth.service';
import { useRouter, useSegments } from 'expo-router';
// import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Notifications.setNotificationHandler({
//     handleNotification: async () => ({
//         shouldShowAlert: true,
//         shouldPlaySound: false,
//         shouldSetBadge: false,
//         shouldShowBanner: true,
//         shouldShowList: true,
//     }),
// });

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    refreshUser: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const segments = useSegments();
    const router = useRouter();

    const checkAuth = async () => {
        try {
            const token = await AuthService.getToken();
            if (token) {
                const userData = await AuthService.getUser();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        const inAuthGroup = segments[0] === '(tabs)' || segments[0] === 'management';
        const inLogin = segments[0] === 'login';

        if (isLoading) return;

        if (!user && inAuthGroup) {
            // Redirect to login if accessing protected area without user
            router.replace('/login');
        } else if (user && inLogin) {
            // Redirect to dashboard if logged in and on login page
            router.replace('/(tabs)/dashboard');
        }
    }, [user, segments, isLoading]);

    const login = async (user: User) => {
        setUser(user);
        // Explicitly handle redirection here if needed, or let the effect handle it
        // The effect might be too slow or race with the router.replace in login.tsx
        // But updating state here ensures the effect sees specific user data.
    };

    const refreshUser = async () => {
        try {
            const userData = await AuthService.getUser();
            setUser(userData);
        } catch (error) {
            console.error('Failed to refresh user', error);
        }
    };

    const logout = async () => {
        await AuthService.logout();
        setUser(null);
        // Force redirect to login
        router.replace('/login');
    };



    // Handle session expiration
    useEffect(() => {
        const unsubscribe = AuthService.subscribeToAuthExpired(() => {
            console.log('Session expired, logging out...');
            logout();
        });
        return () => unsubscribe();
    }, []);

    // Push Notification Registration - DISABLED FOR EXPO GO STABILITY
    const registerForPushNotificationsAsync = async () => {
        /*
        if (Platform.OS === 'web') return;

        // Safety check for Expo Go (Notifications module removed in SDK 53+ Go client)
        if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
            console.log('Skipping Push Token Registration: Not supported in Expo Go on Android (SDK 53+)');
            // We could also check if Notifications.getPermissionsAsync exists
            return;
        }

        try {
            if (!Notifications.getPermissionsAsync) {
                console.log('Notifications module not available');
                return;
            }

            let token;
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }
                if (finalStatus !== 'granted') {
                    console.log('Failed to get push token for push notification!');
                    return;
                }

                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId: Constants.expoConfig?.extra?.eas?.projectId,
                    })).data;
                    console.log("Expo Push Token:", token);
                } catch (e) {
                    console.log("Failed to get Expo Push Token:", e);
                }
            } else {
                console.log('Must use physical device for Push Notifications');
            }

            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            }

            if (token && user?.id) {
                await AuthService.updatePushToken(user.id, token);
            }
        } catch (e) {
            console.log('Notification registration error (likely Expo Go limitation):', e);
        }
        */
    };

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync();
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

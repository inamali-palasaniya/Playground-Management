
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService, User } from '../services/auth.service';
import { useRouter, useSegments } from 'expo-router';

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

    const refreshUser = async () => {
        const userData = await AuthService.getUser();
        setUser(userData);
    };

    const logout = async () => {
        await AuthService.logout();
        setUser(null);
        router.replace('/login');
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, refreshUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

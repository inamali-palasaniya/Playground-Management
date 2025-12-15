import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AuthService } from '../services/auth.service';

const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#6200ee',
        secondary: '#03dac6',
    },
};

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.title}>Something went wrong.</Text>
                    <Text style={styles.error}>{this.state.error?.toString()}</Text>
                </View>
            );
        }

        return this.props.children;
    }
}

function AuthProtection({ children }: { children: ReactNode }) {
    const segments = useSegments();
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const token = await AuthService.getToken();
                const isLogin = segments[0] === 'login';

                console.log("Auth Check: Token present?", !!token, "Current Segment:", segments[0]);

                if (token) {
                    // Validate token by ensuring we can fetch user details. 
                    // If this fails with 403, the api interceptor will catch it and trigger logout.
                    try {
                        // We assume apiService is available. 
                        // Using a lightweight call or just relying on the next API call to fail.
                        // Ideally, we have a verify endpoint. For now, we rely on the interceptor.
                    } catch (err) {
                        // Error handling handled by interceptor
                    }
                }

                if (!token && !isLogin) {
                    router.replace('/login');
                } else if (token && isLogin) {
                    router.replace('/(tabs)/dashboard');
                }
            } catch (e) {
                console.error("Auth check failed", e);
            } finally {
                setIsReady(true);
            }
        };

        checkAuth();

        // Listen for session expiry (401/403 from API)
        const unsubscribe = AuthService.subscribeToAuthExpired(async () => {
            console.log("Session expired. Logging out...");
            await AuthService.logout();
            router.replace('/login');
        });

        return () => {
            unsubscribe();
        };
    }, [segments]);

    if (!isReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return <>{children}</>;
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    error: { color: 'red' }
});

console.log("[Debug] _layout.tsx loaded");

export default function Layout() {
    console.log("[Debug] Rendering Layout");
    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <PaperProvider theme={theme}>
                    <AuthProtection>
                        <Slot />
                    </AuthProtection>
                </PaperProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}


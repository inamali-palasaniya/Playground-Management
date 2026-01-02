import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { AuthService } from '../services/auth.service';
import { GlobalLoader } from '../components/GlobalLoader';

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

import { AuthProvider, useAuth } from '../context/AuthContext';

function AuthProtection({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
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

export default function Layout() {
    useEffect(() => {
        async function checkUpdates() {
            try {
                if (__DEV__) return;

                const update = await Updates.checkForUpdateAsync();
                if (update.isAvailable) {
                    Alert.alert(
                        'Update Available',
                        'A new version of the app is available. Would you like to update now?',
                        [
                            { text: 'Later', style: 'cancel' },
                            {
                                text: 'Update',
                                onPress: async () => {
                                    try {
                                        await Updates.fetchUpdateAsync();
                                        await Updates.reloadAsync();
                                    } catch (e) {
                                        Alert.alert('Error', 'Failed to fetch update');
                                    }
                                }
                            }
                        ]
                    );
                }
            } catch (error) {
                console.log('Error checking for updates:', error);
            }
        }

        checkUpdates();
    }, []);

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <PaperProvider theme={theme}>
                    <AuthProvider>
                        <AuthProtection>
                            <GlobalLoader />
                            <Stack screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                <Stack.Screen name="login" options={{ headerShown: false }} />
                                <Stack.Screen name="management" options={{ headerShown: false }} />
                            </Stack>
                        </AuthProtection>
                    </AuthProvider>
                </PaperProvider>
            </SafeAreaProvider>
        </ErrorBoundary>
    );
}

import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider, MD3LightTheme, ActivityIndicator } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { StatusBar } from 'expo-status-bar';
import { AuthService } from '../services/auth.service';
import { GlobalLoader } from '../components/GlobalLoader';

const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#1E3A8A', // Deep Sports Navy
        secondary: '#F97316', // Energetic Orange
        tertiary: '#38BDF8', // Light Blue accent
        error: '#EF4444', 
        primaryContainer: '#DBEAFE',
        secondaryContainer: '#FFEDD5',
        surface: '#FFFFFF',
        background: '#F8FAFC', // Sleek grayish-white background
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

function MandatoryUpdateScreen({ status, error }: { status: string, error?: string }) {
    return (
        <View style={{ flex: 1, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', padding: 30 }}>
            <MaterialCommunityIcons name="cloud-download" size={80} color="white" />
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 20, textAlign: 'center' }}>
                Update Required
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 10, textAlign: 'center' }}>
                {status}
            </Text>
            {error ? (
                <Text style={{ color: '#FF9999', marginTop: 20, textAlign: 'center' }}>{error}</Text>
            ) : (
                <ActivityIndicator color="white" style={{ marginTop: 30 }} size="large" />
            )}
        </View>
    );
}

import { MaterialCommunityIcons } from '@expo/vector-icons';

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    error: { color: 'red' }
});

export default function Layout() {
    const [updateStatus, setUpdateStatus] = useState<{ isRequired: boolean, status: string, error?: string }>({ 
        isRequired: false, 
        status: 'Checking for updates...' 
    });

    useEffect(() => {
        async function checkUpdates() {
            try {
                if (__DEV__) return;

                console.log("Checking for updates...");
                const update = await Updates.checkForUpdateAsync();
                
                if (update.isAvailable) {
                    setUpdateStatus({ isRequired: true, status: 'New version found. Preparing download...' });
                    
                    try {
                        console.log("Fetching update...");
                        await Updates.fetchUpdateAsync();
                        setUpdateStatus({ isRequired: true, status: 'Update downloaded successfully. Applying changes...' });
                        
                        // Small delay to ensure the user sees the success message
                        setTimeout(async () => {
                            try {
                                await Updates.reloadAsync();
                            } catch (error) {
                                console.error("Reload failed:", error);
                                setUpdateStatus({ 
                                    isRequired: true, 
                                    status: 'Download complete but restart failed.', 
                                    error: 'Please close and reopen the app manually to apply the update.' 
                                });
                            }
                        }, 1500);
                        
                    } catch (e: any) {
                        console.error("Fetch error:", e);
                        setUpdateStatus({ 
                            isRequired: true, 
                            status: 'Failed to download update.', 
                            error: 'Please check your internet connection. If this persists, avoid using public WiFi.' 
                        });
                    }
                } else {
                    console.log("No update available.");
                }
            } catch (error) {
                console.error('Update check error:', error);
            }
        }

        checkUpdates();
    }, []);

    if (updateStatus.isRequired) {
        return (
            <PaperProvider theme={theme}>
                <MandatoryUpdateScreen status={updateStatus.status} error={updateStatus.error} />
            </PaperProvider>
        );
    }

    return (
        <ErrorBoundary>
            <SafeAreaProvider>
                <PaperProvider theme={theme}>
                    <AuthProvider>
                        <AuthProtection>
                            <StatusBar style="dark" />
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

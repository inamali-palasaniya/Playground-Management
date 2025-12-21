import Constants from 'expo-constants';

const getBaseUrl = () => {
    // 1. Development (Expo Go) - Dynamically determine IP
    // Prioritize this so .env doesn't break local testing
    if (__DEV__) {
        // For web, localhost is usually more reliable
        if (require('react-native').Platform.OS === 'web') {
            return 'http://localhost:3000';
        }
        const hostUri = Constants.expoConfig?.hostUri;
        const ip = hostUri ? hostUri.split(':')[0] : 'localhost';
        return `http://${ip}:3000`;
    }

    // 2. Production Build (APK) - Use the URL defined in eas.json or .env
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    return 'http://localhost:3000';
};

export const API_BASE_URL = getBaseUrl();

export const API_ENDPOINTS = {
    matches: '/api/matches',
    users: '/api/users',
    subscriptions: '/api/subscriptions',
    expenses: '/api/expenses',
};

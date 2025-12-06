// Use your computer's local IP address instead of localhost for physical devices
// You can find this IP in the Expo output (exp://YOUR_IP:8081)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.180:3000';

export const API_ENDPOINTS = {
    matches: '/api/matches',
    users: '/api/users',
    subscriptions: '/api/subscriptions',
    expenses: '/api/expenses',
};

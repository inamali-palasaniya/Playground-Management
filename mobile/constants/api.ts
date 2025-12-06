// Using Render deployment (works from anywhere, no network issues)
// Note: First request after 15min inactivity takes 30-60s (free tier cold start)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://playground-management-nal2.onrender.com';

export const API_ENDPOINTS = {
    matches: '/api/matches',
    users: '/api/users',
    subscriptions: '/api/subscriptions',
    expenses: '/api/expenses',
};

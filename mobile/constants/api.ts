// Production API URL from Render deployment
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://playground-management-nal2.onrender.com';

export const API_ENDPOINTS = {
    matches: '/api/matches',
    users: '/api/users',
    subscriptions: '/api/subscriptions',
    expenses: '/api/expenses',
};

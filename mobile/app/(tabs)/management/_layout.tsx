import { Stack } from 'expo-router';

export default function ManagementLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="users" />
            <Stack.Screen name="add-user" />
        </Stack>
    );
}

import { Stack } from 'expo-router';

export default function UsersLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: 'Community' }} />
        </Stack>
    );
}

import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter, Redirect } from 'expo-router';

export default function Home() {
    return <Redirect href="/(tabs)/management" />;
}

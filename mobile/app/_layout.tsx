import { Slot } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';


const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#6200ee',
        secondary: '#03dac6',
    },
};

export default function Layout() {
    return (
        <SafeAreaProvider>
            <PaperProvider theme={theme}>
                <Slot />
            </PaperProvider>
        </SafeAreaProvider>
    );
}

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { List, Divider, Appbar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

export default function MastersScreen() {
    const router = useRouter();
    const theme = useTheme();

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.BackAction onPress={() => router.back()} />
                <Appbar.Content title="Manage Masters" />
            </Appbar.Header>

            <List.Section>
                <List.Subheader>Configuration</List.Subheader>
                <List.Item
                    title="Subscription Plans"
                    description="Manage monthly/daily plans and rates"
                    left={props => <List.Icon {...props} icon="notebook-edit" />}
                    onPress={() => router.push('/management/masters/plans')}
                />
                <Divider />
                <List.Item
                    title="Fine Rules"
                    description="Set fine amounts and types"
                    left={props => <List.Icon {...props} icon="gavel" />}
                    onPress={() => router.push('/management/masters/fines')}
                />
                <Divider />
                <List.Item
                    title="User Groups"
                    description="Organize users into groups"
                    left={props => <List.Icon {...props} icon="account-group" />}
                    onPress={() => router.push('/management/masters/groups')}
                />
            </List.Section>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
});

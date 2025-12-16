import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Portal, Modal, Text } from 'react-native-paper';
import { loaderService } from '../services/loader.service';

export const GlobalLoader = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const unsubscribe = loaderService.subscribe((isLoading) => {
            setVisible(isLoading);
        });
        return unsubscribe;
    }, []);

    if (!visible) return null;

    return (
        <Portal>
            <Modal visible={true} dismissable={false} contentContainerStyle={styles.container}>
                <View style={styles.content}>
                    <ActivityIndicator animating={true} size="large" color="#1565c0" />
                    <Text style={styles.text}>Loading...</Text>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        elevation: 5
    },
    text: {
        fontSize: 16,
        fontWeight: '500'
    }
});

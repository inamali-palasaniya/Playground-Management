import React, { useState } from 'react';
import { View, FlatList } from 'react-native';
import { Button, Portal, Dialog, Searchbar, List, Text } from 'react-native-paper';

export function SearchableDropdown({ label, data, value, onSelect, placeholder = 'Search...' }: any) {
    const [visible, setVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredData = data.filter((item: any) => item.label.toLowerCase().includes(searchQuery.toLowerCase()));
    const selectedItem = data.find((item: any) => item.value === value);

    return (
        <View style={{ marginBottom: 15 }}>
            <Text variant="titleMedium" style={{ marginBottom: 5 }}>{label}</Text>
            <Button mode="outlined" onPress={() => setVisible(true)}>
                {selectedItem ? selectedItem.label : `Select ${label}`}
            </Button>
            <Portal>
                <Dialog visible={visible} onDismiss={() => setVisible(false)} style={{ maxHeight: '80%' }}>
                    <Dialog.Title>{label}</Dialog.Title>
                    <Dialog.Content>
                        <Searchbar
                            placeholder={placeholder}
                            onChangeText={setSearchQuery}
                            value={searchQuery}
                            style={{ marginBottom: 10 }}
                        />
                        <FlatList
                            data={filteredData}
                            keyExtractor={item => item.value.toString()}
                            renderItem={({ item }) => (
                                <List.Item
                                    title={item.label}
                                    onPress={() => {
                                        onSelect(item.value);
                                        setVisible(false);
                                        setSearchQuery('');
                                    }}
                                />
                            )}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setVisible(false)}>Close</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </View>
    );
}

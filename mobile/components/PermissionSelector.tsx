import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/api.service';

interface PermissionItem {
    module_name: string;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

interface PermissionSelectorProps {
    permissions: PermissionItem[];
    onChange: (updatedPermissions: PermissionItem[]) => void;
    readonly?: boolean;
}

const MODULES = ['user', 'expense', 'payment', 'charge', 'scoring', 'master_plans', 'master_fines', 'master_groups'];

export const PermissionSelector = ({ permissions, onChange, readonly = false }: PermissionSelectorProps) => {
    const theme = useTheme();

    const getPermission = (module: string) => {
        return permissions.find(p => p.module_name === module) || { module_name: module, can_add: false, can_edit: false, can_delete: false };
    };

    const togglePermission = (module: string, type: 'can_add' | 'can_edit' | 'can_delete') => {
        if (readonly) return;
        const current = getPermission(module);
        const newValue = !current[type];

        // Remove existing from list and add updated
        const otherPermissions = permissions.filter(p => p.module_name !== module);
        const updatedPermission = { ...current, [type]: newValue };

        onChange([...otherPermissions, updatedPermission]);
    };

    const renderIcon = (module: string, type: 'can_add' | 'can_edit' | 'can_delete') => {
        const isActive = getPermission(module)[type];
        let iconName: any = 'circle-outline';
        let color = '#ccc';

        if (type === 'can_add') { iconName = 'plus-circle'; color = isActive ? '#4CAF50' : '#e0e0e0'; }
        if (type === 'can_edit') { iconName = 'pencil-circle'; color = isActive ? '#FFC107' : '#e0e0e0'; }
        if (type === 'can_delete') { iconName = 'delete-circle'; color = isActive ? '#F44336' : '#e0e0e0'; }

        // Filled preference
        if (isActive) {
            // keep color
        } else {
            color = '#e0e0e0'; // Light gray disabled
        }

        return (
            <IconButton
                icon={isActive ? iconName.replace('-outline', '') : iconName}
                iconColor={color}
                size={30}
                onPress={() => togglePermission(module, type)}
                disabled={readonly}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.col, styles.moduleCol]}>Module</Text>
                <Text style={styles.col}>Add</Text>
                <Text style={styles.col}>Edit</Text>
                <Text style={styles.col}>Del</Text>
            </View>
            <Divider />
            {MODULES.map((module) => (
                <View key={module} style={styles.row}>
                    <Text style={[styles.col, styles.moduleCol, { textTransform: 'capitalize' }]}>{module.replace('master_', 'Master: ')}</Text>
                    <View style={styles.col}>{renderIcon(module, 'can_add')}</View>
                    <View style={styles.col}>{renderIcon(module, 'can_edit')}</View>
                    <View style={styles.col}>{renderIcon(module, 'can_delete')}</View>
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { padding: 10, backgroundColor: 'white', borderRadius: 8 },
    headerRow: { flexDirection: 'row', paddingBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    col: { flex: 1, textAlign: 'center', justifyContent: 'center', alignItems: 'center' },
    moduleCol: { flex: 2, textAlign: 'left', fontWeight: 'bold' }
});

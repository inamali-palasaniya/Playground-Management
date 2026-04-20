import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Text, IconButton, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiService from '../services/api.service';

interface PermissionItem {
    module_name: string;
    can_view: boolean;
    can_add: boolean;
    can_edit: boolean;
    can_delete: boolean;
}

interface PermissionSelectorProps {
    permissions: PermissionItem[];
    onChange: (updatedPermissions: PermissionItem[]) => void;
    readonly?: boolean;
    userRole?: string;
}

const MODULES = ['user', 'expense', 'payment', 'finance', 'attendance', 'cricket_scoring', 'tournament', 'team', 'match', 'group', 'subscription', 'report', 'master_plans', 'master_fines', 'master_groups', 'audit'];

export const PermissionSelector = ({ permissions, onChange, readonly = false, userRole }: PermissionSelectorProps) => {
    const theme = useTheme();

    const getPermission = (module: string) => {
        if (userRole === 'SUPER_ADMIN') {
            return { module_name: module, can_view: true, can_add: true, can_edit: true, can_delete: true };
        }
        return permissions.find(p => p.module_name === module) || { module_name: module, can_view: false, can_add: false, can_edit: false, can_delete: false };
    };

    const togglePermission = (module: string, type: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
        if (readonly) return;
        const current = getPermission(module);
        const newValue = !current[type];

        // Remove existing from list and add updated
        const otherPermissions = permissions.filter(p => p.module_name !== module);
        const updatedPermission = { ...current, [type]: newValue };

        onChange([...otherPermissions, updatedPermission]);
    };

    const toggleAll = (module: string) => {
        if (readonly) return;
        const current = getPermission(module);
        const allActive = current.can_view && current.can_add && current.can_edit && current.can_delete;
        const newValue = !allActive;
        const otherPermissions = permissions.filter(p => p.module_name !== module);
        const updatedPermission = { ...current, can_view: newValue, can_add: newValue, can_edit: newValue, can_delete: newValue };
        onChange([...otherPermissions, updatedPermission]);
    };

    const renderIcon = (module: string, type: 'can_view' | 'can_add' | 'can_edit' | 'can_delete') => {
        const isActive = getPermission(module)[type];
        let iconName: any = 'circle-outline';
        let color = '#ccc';

        if (type === 'can_view') { iconName = 'eye'; color = isActive ? '#2196F3' : '#e0e0e0'; }
        if (type === 'can_add') { iconName = 'plus-circle'; color = isActive ? '#4CAF50' : '#e0e0e0'; }
        if (type === 'can_edit') { iconName = 'pencil-circle'; color = isActive ? '#FFC107' : '#e0e0e0'; }
        if (type === 'can_delete') { iconName = 'delete-circle'; color = isActive ? '#F44336' : '#e0e0e0'; }

        // Increase contrast for active but readonly icons so they don't look "off"
        if (readonly && isActive) {
            // Keep the vibrant color
        } else if (!isActive) {
            color = '#e0e0e0';
        }

        return (
            <IconButton
                icon={isActive ? iconName.replace('-outline', '') : iconName}
                iconColor={color}
                size={26}
                onPress={() => !readonly && togglePermission(module, type)}
                // Removed disabled={readonly} to keep state visible
                // but added rippleColor to prevent interaction feedback
                rippleColor={readonly ? 'transparent' : undefined}
            />
        );
    };

    const renderToggleAllIcon = (module: string) => {
        const current = getPermission(module);
        const allActive = current.can_view && current.can_add && current.can_edit && current.can_delete;
        return (
            <IconButton
                icon={allActive ? 'check-all' : 'checkbox-multiple-blank-outline'}
                iconColor={allActive ? '#9C27B0' : '#e0e0e0'}
                size={26}
                onPress={() => !readonly && toggleAll(module)}
                rippleColor={readonly ? 'transparent' : undefined}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={[styles.col, styles.moduleCol]}>Module</Text>
                <Text style={styles.col}>View</Text>
                <Text style={styles.col}>Add</Text>
                <Text style={styles.col}>Edit</Text>
                <Text style={styles.col}>Del</Text>
                <Text style={styles.col}>All</Text>
            </View>
            <Divider />
            {MODULES.map((module) => (
                <View key={module} style={styles.row}>
                    <Text style={[styles.col, styles.moduleCol, { textTransform: 'capitalize' }]}>
                        {module === 'cricket_scoring' ? 'Scoring (Cricket)' : 
                         module.replace('master_', 'Master: ').replace(/_/g, ' ')}
                    </Text>
                    <View style={styles.col}>{renderIcon(module, 'can_view')}</View>
                    <View style={styles.col}>{renderIcon(module, 'can_add')}</View>
                    <View style={styles.col}>{renderIcon(module, 'can_edit')}</View>
                    <View style={styles.col}>{renderIcon(module, 'can_delete')}</View>
                    <View style={styles.col}>{renderToggleAllIcon(module)}</View>
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

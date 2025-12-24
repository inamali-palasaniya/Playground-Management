import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { TextInput, Button, Text, HelperText, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/auth.service';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const theme = useTheme();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Identifier
    const [identifier, setIdentifier] = useState('');

    // Step 2: OTP & New Password
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSendOTP = async () => {
        if (!identifier.trim()) {
            Alert.alert('Error', 'Please enter your email or phone');
            return;
        }

        setLoading(true);
        try {
            // Unified Flow: Backend handles Email/SMS
            // This bypasses Firebase Client billing requirements for Phone Auth
            await AuthService.forgotPassword(identifier);
            setStep(2);
            Alert.alert('OTP Sent', 'Check your email/SMS for the code.');
        } catch (e: any) {
            console.error("Forgot Password Error:", e);
            Alert.alert('Error', e.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!otp.trim() || !newPassword.trim()) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        setLoading(true);

        try {
            // Unified Flow: Backend verification
            await AuthService.resetPassword(identifier, otp, newPassword);
            Alert.alert('Success', 'Password reset successfully. Please login.');
            router.back();
        } catch (e: any) {
            // console.error(e);
            Alert.alert('Error', e.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={{ marginBottom: 20, textAlign: 'center', fontWeight: 'bold' }}>
                {step === 1 ? 'Forgot Password' : 'Reset Password'}
            </Text>

            {step === 1 ? (
                <>
                    <Text style={{ marginBottom: 20, textAlign: 'center', color: 'gray' }}>
                        Enter your registered email or phone number to receive an OTP.
                    </Text>
                    <TextInput
                        label="Email or Phone (e.g. 9876543210)"
                        value={identifier}
                        onChangeText={setIdentifier}
                        mode="outlined"
                        autoCapitalize="none"
                        left={<TextInput.Icon icon="account-search" />}
                        style={{ marginBottom: 15 }}
                    />
                    <Button
                        mode="contained"
                        onPress={handleSendOTP}
                        loading={loading}
                        disabled={loading}
                        style={{ marginTop: 10 }}
                    >
                        Send OTP
                    </Button>
                </>
            ) : (
                <>
                    <Text style={{ marginBottom: 20, textAlign: 'center', color: 'gray' }}>
                        Enter the OTP sent to {identifier} and set your new password.
                    </Text>
                    <TextInput
                        label="OTP Code"
                        value={otp}
                        onChangeText={setOtp}
                        mode="outlined"
                        keyboardType="number-pad"
                        left={<TextInput.Icon icon="lock-question" />}
                        style={{ marginBottom: 10 }}
                    />
                    <TextInput
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        mode="outlined"
                        secureTextEntry
                        left={<TextInput.Icon icon="lock" />}
                        style={{ marginBottom: 10 }}
                    />
                    <TextInput
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        mode="outlined"
                        secureTextEntry
                        left={<TextInput.Icon icon="lock-check" />}
                        style={{ marginBottom: 15 }}
                    />
                    <Button
                        mode="contained"
                        onPress={handleResetPassword}
                        loading={loading}
                        disabled={loading}
                        style={{ marginTop: 10 }}
                    >
                        Reset Password
                    </Button>
                    <Button
                        mode="text"
                        onPress={() => setStep(1)}
                        disabled={loading}
                        style={{ marginTop: 10 }}
                    >
                        Back to OTP Request
                    </Button>
                </>
            )}

            <Button
                mode="text"
                onPress={() => router.back()}
                style={{ marginTop: 20 }}
            >
                Back to Login
            </Button>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        backgroundColor: 'white'
    }
});

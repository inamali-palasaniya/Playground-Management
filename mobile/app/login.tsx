import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { AuthService } from '../services/auth.service';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      // Using error state on inputs could be better, but Alert is fine for now
      return;
    }

    setLoading(true);
    try {
        await AuthService.login(email, password);
        router.replace('/(tabs)/dashboard');
      } catch (error: any) {
      alert(error.message || 'Login Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inner}
        >
          {/* Logo / Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons name="soccer" size={64} color={theme.colors.primary || '#1565c0'} />
            </View>
            <Text variant="headlineMedium" style={styles.title}>Welcome Back</Text>
            <Text variant="bodyLarge" style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form Section */}
          <View style={styles.form}>
            <TextInput
              label="Email or Phone"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
              theme={{ roundness: 12 }}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
              left={<TextInput.Icon icon="lock" />}
              style={styles.input}
              theme={{ roundness: 12 }}
            />

            <Button
              mode="text"
              compact
              style={styles.forgotPass}
              labelStyle={{ color: theme.colors.primary || '#1565c0' }}
            >
              Forgot Password?
            </Button>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !email || !password}
              style={styles.loginButton}
              contentStyle={{ height: 50 }}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              {loading ? 'Signing In...' : 'Login'}
            </Button>
          </View>

          {/* Footer Section */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: '#666' }}>
              Don't have an account?
            </Text>
            <Button
              mode="text"
              compact
              onPress={() => alert('Please contact administrator for access.')}
            >
              Contact Admin
            </Button>
          </View>

        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f4f8',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  forgotPass: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  loginButton: {
    borderRadius: 12,
    backgroundColor: '#1565c0', // Fallback if theme primary is missing
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  }
});

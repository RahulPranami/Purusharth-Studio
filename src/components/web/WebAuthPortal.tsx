import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { AdminIcon } from '@/components/admin/AdminIcon';

export function WebAuthPortal() {
  const router = useRouter();
  const { signInWithPassword, resetPasswordForEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('rahulpranami101@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setFeedback({ type: 'error', message: 'Please enter both your email and password.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await signInWithPassword(email, password);
    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Access granted. Entering Studio Console...' });
      setTimeout(() => {
        router.replace('/admin' as any);
      }, 400);
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Invalid credentials. Please verify your email and password.',
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email to receive a password reset link.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await resetPasswordForEmail(email);
    setLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Password reset link sent to your email. Please check your inbox and click the recovery link.',
      });
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Unable to send password reset email. Please try again.',
      });
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        {/* Emblem & Minimal Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/studio-logo-transparent.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.portalTitle}>
            {mode === 'login' ? 'Super Admin Sign In' : 'Reset Password'}
          </Text>
          <Text style={styles.portalSubtitle}>
            {mode === 'login'
              ? 'Enter your credentials to access the studio console.'
              : 'Enter your email to receive a secure recovery link.'}
          </Text>
        </View>

        {/* Feedback Alert */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess,
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        )}

        {mode === 'login' ? (
          /* Login Form */
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="admin@purusharthstudio.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => {
                    setFeedback(null);
                    setMode('forgot');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <AdminIcon
                    name={showPassword ? 'close' : 'face'}
                    size={18}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Forgot Password Form */
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="admin@purusharthstudio.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleForgotPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleForgotPassword}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>Send Recovery Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginBtn}
              onPress={() => {
                setFeedback(null);
                setMode('login');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backToLoginText}>← Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    minHeight: '100%',
    backgroundColor: '#f5f0ea',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 36,
    borderWidth: 1,
    borderColor: '#e8e2d8',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 20px 40px rgba(44, 34, 20, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
        }
      : {
          elevation: 6,
        }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 170,
    height: 48,
    marginBottom: 18,
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1917',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  portalSubtitle: {
    fontSize: 13,
    color: '#6e6a63',
    textAlign: 'center',
    lineHeight: 18,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38342e',
    marginBottom: 6,
  },
  forgotLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#755A2A',
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#dcd6cb',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1a1917',
    backgroundColor: '#faf8f5',
    outlineStyle: 'none' as any,
  },
  passwordWrapper: {
    position: 'relative',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: 13,
    padding: 2,
  },
  submitBtn: {
    width: '100%',
    height: 46,
    backgroundColor: '#1a1917',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#1a1917',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  backToLoginBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  backToLoginText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  feedbackSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackTextError: {
    color: '#991b1b',
  },
  feedbackTextSuccess: {
    color: '#166534',
  },
});

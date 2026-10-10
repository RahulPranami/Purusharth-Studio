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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match. Please re-enter.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await updatePassword(password);
    setLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Password updated successfully! Redirecting to Studio Console...',
      });
      setTimeout(() => {
        router.replace('/admin' as any);
      }, 1200);
    } else {
      setFeedback({
        type: 'error',
        message: res.message || 'Failed to update password. Your recovery link may have expired.',
      });
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        {/* Emblem & Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/studio-logo-transparent.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below to secure your Super Admin account.
          </Text>
        </View>

        {/* Feedback message */}
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

        {/* Form Body */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, { paddingRight: 48 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimum 6 characters"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, { paddingRight: 48 }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleUpdate}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>Update Password</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.backBtnText}>← Return to Sign In</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 24,
  },
  logo: {
    width: 170,
    height: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1917',
    marginBottom: 6,
  },
  subtitle: {
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38342e',
    marginBottom: 6,
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
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  backBtnText: {
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

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

export function WebAuthPortal() {
  const router = useRouter();
  const { signInWithOtp, verifyOtp, signInWithPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'director' | 'client'>('director');

  // Director Password Login State
  const [directorEmail, setDirectorEmail] = useState('rahulpranami101@gmail.com');
  const [directorPassword, setDirectorPassword] = useState('');
  const [directorLoading, setDirectorLoading] = useState(false);

  // Client OTP State
  const [clientContact, setClientContact] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [clientLoading, setClientLoading] = useState(false);

  // Alerts
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleDirectorLogin = async () => {
    if (!directorEmail.trim() || !directorPassword.trim()) {
      setFeedback({ type: 'error', message: 'Please enter both your email identifier and password.' });
      return;
    }

    setDirectorLoading(true);
    setFeedback(null);

    const res = await signInWithPassword(directorEmail, directorPassword);
    setDirectorLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Clearance verified. Entering Studio Console...' });
      setTimeout(() => {
        router.replace('/admin' as any);
      }, 400);
    } else {
      setFeedback({ type: 'error', message: res.message || 'Authentication failed. Please check credentials.' });
    }
  };

  const handleSendClientOtp = async () => {
    if (!clientContact.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email or mobile number.' });
      return;
    }

    setClientLoading(true);
    setFeedback(null);

    const res = await signInWithOtp(clientContact);
    setClientLoading(false);

    if (res.success) {
      setOtpSent(true);
      setFeedback({ type: 'success', message: '6-digit verification code has been dispatched.' });
    } else {
      setFeedback({ type: 'error', message: res.message || 'Failed to dispatch code. Please retry.' });
    }
  };

  const handleVerifyClientOtp = async () => {
    if (!otpCode.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the 6-digit OTP code.' });
      return;
    }

    setClientLoading(true);
    setFeedback(null);

    const res = await verifyOtp(clientContact, otpCode);
    setClientLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Access verified. Unlocking private archive...' });
      // Parent component will re-render client view once auth updates
    } else {
      setFeedback({ type: 'error', message: res.message || 'Invalid or expired verification code.' });
    }
  };

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        {/* Emblem & Editorial Masthead */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/studio-logo-transparent.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.motto}>YOUR MOMENTS. YOUR MEMORIES.</Text>
          <Text style={styles.portalTitle}>Studio Web Portal</Text>
          <Text style={styles.portalSubtitle}>
            Secure authentication required to access private archives and studio controls.
          </Text>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'director' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('director');
              setFeedback(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'director' && styles.tabTextActive]}>
              Studio Director
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'client' && styles.tabBtnActive]}
            onPress={() => {
              setActiveTab('client');
              setFeedback(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'client' && styles.tabTextActive]}>
              Client / VIP Guest
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback message */}
        {feedback && (
          <View style={[styles.feedbackBox, feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess]}>
            <Text style={[styles.feedbackText, feedback.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess]}>
              {feedback.message}
            </Text>
          </View>
        )}

        {/* TAB 1: STUDIO DIRECTOR / SUPER ADMIN (PASSWORD) */}
        {activeTab === 'director' && (
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>DIRECTOR EMAIL IDENTIFIER</Text>
              <TextInput
                style={styles.input}
                value={directorEmail}
                onChangeText={setDirectorEmail}
                placeholder="rahulpranami101@gmail.com"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MASTER PASSWORD</Text>
              <TextInput
                style={styles.input}
                value={directorPassword}
                onChangeText={setDirectorPassword}
                placeholder="••••••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleDirectorLogin}
              disabled={directorLoading}
              activeOpacity={0.8}
            >
              {directorLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In to Operations Console →</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.hintText}>
              Configured for Super Admin clearance with full studio event & media control.
            </Text>
          </View>
        )}

        {/* TAB 2: CLIENT / VIP MEMBER (OTP) */}
        {activeTab === 'client' && (
          <View style={styles.formSection}>
            {!otpSent ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL OR MOBILE NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    value={clientContact}
                    onChangeText={setClientContact}
                    placeholder="guest@domain.com or +91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleSendClientOtp}
                  disabled={clientLoading}
                  activeOpacity={0.8}
                >
                  {clientLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Request Secure OTP Passcode →</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>ENTER 6-DIGIT PASSCODE</Text>
                  <TextInput
                    style={[styles.input, styles.otpInput]}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="••••••"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={8}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleVerifyClientOtp}
                  disabled={clientLoading}
                  activeOpacity={0.8}
                >
                  {clientLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Unlock Private Vault</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    setOtpSent(false);
                    setOtpCode('');
                  }}
                >
                  <Text style={styles.linkButtonText}>← Edit Contact or Resend Code</Text>
                </TouchableOpacity>
              </>
            )}

            <Text style={styles.hintText}>
              Clients can also access their event directly on the mobile app using their private Event Code.
            </Text>
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
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 36,
    borderWidth: 1,
    borderColor: '#EFEBE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 170,
    height: 48,
    marginBottom: 8,
  },
  motto: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#755A2A',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1917',
    marginBottom: 6,
    fontFamily: Platform.OS === 'web' ? 'Georgia, serif' : undefined,
  },
  portalSubtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F2EC',
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  tabTextActive: {
    color: '#1C1917',
    fontWeight: '700',
  },
  formSection: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#44403C',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E7E0D6',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#1C1917',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: '700',
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#755A2A',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  linkButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#755A2A',
    fontSize: 12,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 11,
    color: '#A8A29E',
    textAlign: 'center',
    marginTop: 18,
    lineHeight: 16,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  feedbackSuccess: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  feedbackText: {
    fontSize: 12,
    lineHeight: 16,
  },
  feedbackTextError: {
    color: '#B91C1C',
  },
  feedbackTextSuccess: {
    color: '#15803D',
  },
});

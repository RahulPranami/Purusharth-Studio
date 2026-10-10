import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth-context';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithOtp, verifyOtp } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleSendOtp = async () => {
    if (!contact.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email or phone number.' });
      return;
    }
    if (isRegister && !fullName.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your full name.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await signInWithOtp(contact, isRegister, fullName, inviteCode);
    setLoading(false);

    if (res.success) {
      setOtpSent(true);
      setFeedback({
        type: 'success',
        message: res.message || 'OTP verification code has been dispatched.',
      });
    } else {
      setFeedback({ type: 'error', message: res.message || 'Failed to send OTP. Please retry.' });
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim()) {
      setFeedback({ type: 'error', message: 'Please enter the 6-digit OTP code.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await verifyOtp(contact, otpCode);
    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Verified! Entering studio vault...' });
      setTimeout(() => {
        router.replace('/');
      }, 500);
    } else {
      setFeedback({ type: 'error', message: res.message || 'Invalid or expired OTP token.' });
    }
  };



  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.card}>
        {/* Brand Emblem */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/studio-logo-transparent.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandSubtitle}>“Your Moments. Your Memories.”</Text>

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

        {!otpSent ? (
          /* CLIENT OTP SIGN IN / REGISTER */
          <View style={styles.formSection}>
            {/* Segmented Control */}
            <View style={styles.segmentTrack}>
              <TouchableOpacity
                style={[styles.segmentBtn, !isRegister && styles.segmentBtnActive]}
                onPress={() => {
                  setIsRegister(false);
                  setFeedback(null);
                }}
              >
                <Text style={[styles.segmentText, !isRegister && styles.segmentTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, isRegister && styles.segmentBtnActive]}
                onPress={() => {
                  setIsRegister(true);
                  setFeedback(null);
                }}
              >
                <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>

            {isRegister && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Eleanor Vance"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address or Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={contact}
                onChangeText={setContact}
                placeholder="name@domain.com or +91 9876543210"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {isRegister && (
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>VIP Invitation Code (Optional)</Text>
                  <Text style={styles.badgeText}>Exclusive Access</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.monoInput]}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="INVITE-2025"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                />
                <Text style={styles.hintText}>
                  Enter an invitation passcode to unlock exclusive galleries and features.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRegister ? 'Register & Request OTP' : 'Continue with OTP'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* MODE 3: ENTER OTP CODE */
          <View style={styles.formSection}>
            <View style={styles.modeHeader}>
              <Text style={styles.formTitle}>Verification Code</Text>
              <Text style={styles.formSub}>
                Enter the 6-digit passcode delivered to {contact}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="••••••"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={8}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Unlock Vault</Text>
              )}
            </TouchableOpacity>

            <View style={styles.otpActionRow}>
              <TouchableOpacity
                onPress={() => {
                  setOtpSent(false);
                  setOtpCode('');
                }}
              >
                <Text style={styles.resendText}>Edit Contact Info</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                <Text style={styles.resendTextBold}>Resend Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Archival Security Badge */}
        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>ARCHIVAL SECURITY</Text>
          <Text style={styles.securityText}>
            Private digital lookbooks are watermark-secured with end-to-end encrypted distribution.
          </Text>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          Purusharth Studio Fine Art Cinematography © 2025
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  scrollContainer: {
    padding: 20,
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  logoContainer: {
    width: 160,
    height: 48,
    alignSelf: 'center',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1B1C19',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    color: '#755A2A',
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: 20,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  feedbackSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  feedbackTextError: {
    color: '#DC2626',
  },
  feedbackTextSuccess: {
    color: '#059669',
  },
  formSection: {
    width: '100%',
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: '#F5F3EE',
    borderRadius: 12,
    padding: 3,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#1B1C19',
    fontWeight: '600',
  },
  modeHeader: {
    marginBottom: 18,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1C19',
  },
  formSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#755A2A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1B1C19',
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1.5,
  },
  otpInput: {
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 15,
  },
  primaryButton: {
    backgroundColor: '#1B1C19',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  secondaryLink: {
    marginTop: 18,
    alignItems: 'center',
  },
  secondaryLinkText: {
    fontSize: 13,
    color: '#755A2A',
    fontWeight: '500',
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  resendText: {
    fontSize: 13,
    color: '#6B7280',
  },
  resendTextBold: {
    fontSize: 13,
    color: '#1B1C19',
    fontWeight: '600',
  },
  securityBox: {
    backgroundColor: '#FBF9F4',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 14,
    padding: 14,
    marginTop: 22,
  },
  securityTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#755A2A',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 17,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
});

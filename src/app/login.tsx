import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioButton } from '@/components/ui/StudioButton';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithOtp, verifyOtp, signInWithPassword, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 16
    : Math.max(insets.top, 16);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  // Auth Form State
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState('');

  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(42);
  const [canResend, setCanResend] = useState(false);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // OTP inputs references
  const digitInputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const handleSendOtp = async () => {
    if (!contact.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email address or mobile number.' });
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
      setCountdown(42);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setFeedback({
        type: 'success',
        message: res.message || 'OTP verification code has been dispatched.',
      });
      // Focus first digit box after small tick
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 300);
    } else {
      setFeedback({ type: 'error', message: res.message || 'Failed to dispatch OTP. Please verify details.' });
    }
  };

  const handlePasswordSignIn = async () => {
    if (!contact.trim() || !password.trim()) {
      setFeedback({ type: 'error', message: 'Please enter your email and password.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    const res = await signInWithPassword(contact, password);
    setLoading(false);

    if (res.success) {
      router.replace('/');
    } else {
      setFeedback({ type: 'error', message: res.message || 'Invalid credentials.' });
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    // If pasted whole 6-digit code
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = clean[i] || '';
      }
      setOtpDigits(newDigits);
      if (clean.length === 6) {
        digitInputRefs.current[5]?.focus();
        submitOtp(clean);
      }
      return;
    }

    const single = value.slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = single;
    setOtpDigits(newDigits);

    // Auto advance
    if (single && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }

    // Auto submit if complete
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      submitOtp(fullCode);
    }
  };

  const handleOtpKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const submitOtp = async (code: string) => {
    setLoading(true);
    setFeedback(null);

    const res = await verifyOtp(contact, code);
    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Identity verified. Entering studio vault...' });
      setTimeout(() => {
        router.replace('/');
      }, 600);
    } else {
      setFeedback({ type: 'error', message: res.message || 'Invalid or expired OTP token. Please retry.' });
    }
  };

  const formatTimer = (secs: number) => {
    const s = secs < 10 ? `0${secs}` : `${secs}`;
    return `00:${s}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Back Navigation Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (otpSent) {
                  setOtpSent(false);
                  setFeedback(null);
                } else if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              style={styles.backButton}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <StudioIcon name="arrow_back_ios" size={16} color={StudioTheme.colors.onSurface} />
              <Text style={styles.backButtonText}>
                {otpSent ? 'Edit Contact' : 'Lookbook'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/')}
              style={styles.homeLink}
            >
              <Text style={styles.homeLinkText}>Studio Home</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Emblem */}
          <View style={styles.brandHero}>
            <View style={styles.logoRing}>
              <Image
                source={require('@/../assets/images/purusharth-studio-logo.jpg')}
                style={styles.logoImg}
                contentFit="contain"
              />
              <View style={styles.logoBadge}>
                <StudioIcon name="lock" size={12} color={StudioTheme.colors.onSecondaryContainer} />
              </View>
            </View>
            <Text style={styles.brandSubtitle}>Purusharth Studio</Text>
            <Text style={styles.brandMotto}>&ldquo;Your Moments. Your Memories.&rdquo;</Text>
          </View>

          {/* Feedback Alert */}
          {feedback && (
            <View
              style={[
                styles.feedbackBox,
                feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
              ]}
            >
              <StudioIcon
                name={feedback.type === 'error' ? 'error' : 'check_circle'}
                size={18}
                color={feedback.type === 'error' ? StudioTheme.colors.error : StudioTheme.colors.success}
                style={{ marginRight: 8 }}
              />
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
            /* STEP 1: SIGN IN / REGISTER FORM */
            <View style={styles.formContainer}>
              <View style={styles.headerBlock}>
                <Text style={styles.formTitle}>
                  {passwordMode ? 'Studio Crew Clearance' : isRegister ? 'Create Account' : 'Sign In or Register'}
                </Text>
                <Text style={styles.formSub}>
                  {passwordMode
                    ? 'Director & DIT password-authenticated access.'
                    : 'Access your private studio galleries and event lookbooks.'}
                </Text>
              </View>

              {!passwordMode && (
                /* Segmented Mode Control */
                <View style={styles.segmentTrack}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, !isRegister && styles.segmentBtnActive]}
                    onPress={() => {
                      setIsRegister(false);
                      setFeedback(null);
                    }}
                    activeOpacity={0.8}
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
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.segmentText, isRegister && styles.segmentTextActive]}>
                      Register
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Full Name (Registration only) */}
              {isRegister && !passwordMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <StudioIcon name="person" size={18} color={StudioTheme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Eleanor Vance"
                      placeholderTextColor={StudioTheme.colors.outline}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email / Mobile Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {passwordMode ? 'Director Email' : 'Email Address or Mobile Number'}
                </Text>
                <View style={styles.inputWrapper}>
                  <StudioIcon name="alternate_email" size={18} color={StudioTheme.colors.outline} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={contact}
                    onChangeText={setContact}
                    placeholder={passwordMode ? 'admin@purusharthstudio.com' : 'name@domain.com or +91 98765 43210'}
                    placeholderTextColor={StudioTheme.colors.outline}
                    autoCapitalize="none"
                    keyboardType={passwordMode ? 'email-address' : 'default'}
                  />
                </View>
              </View>

              {/* Password (if Password Mode) */}
              {passwordMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Studio Password</Text>
                  <View style={styles.inputWrapper}>
                    <StudioIcon name="lock" size={18} color={StudioTheme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••••••"
                      placeholderTextColor={StudioTheme.colors.outline}
                      secureTextEntry
                    />
                  </View>
                </View>
              )}

              {/* Referral / Admin Invite Code (Optional) */}
              {isRegister && !passwordMode && (
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Referral / Admin Code (Optional)</Text>
                    <Text style={styles.labelBadge}>Studio Access</Text>
                  </View>
                  <View style={styles.inputWrapper}>
                    <StudioIcon name="key" size={18} color={StudioTheme.colors.outline} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, styles.codeFormat]}
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      placeholder="e.g. INVITE-2025"
                      placeholderTextColor={StudioTheme.colors.outline}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={styles.inviteNotice}>
                    <StudioIcon name="verified_user" size={16} color={StudioTheme.colors.secondary} style={{ marginTop: 2, marginRight: 6 }} />
                    <Text style={styles.inviteNoticeText}>
                      Enter an admin referral code to request Event Admin clearance. Privileges require server verification.
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <View style={styles.actionContainer}>
                <StudioButton
                  label={
                    passwordMode
                      ? 'Sign In to Studio Console'
                      : isRegister
                      ? 'Register & Request OTP'
                      : 'Continue with OTP'
                  }
                  onPress={passwordMode ? handlePasswordSignIn : handleSendOtp}
                  loading={loading}
                  iconTrailingName="arrow_forward"
                  size="lg"
                />
              </View>

              {/* Mode switch: Password mode toggle */}
              <TouchableOpacity
                style={styles.togglePasswordMode}
                onPress={() => {
                  setPasswordMode(!passwordMode);
                  setFeedback(null);
                }}
              >
                <Text style={styles.togglePasswordModeText}>
                  {passwordMode ? '← Switch to Guest OTP Access' : '⚡ Studio Director Password Login'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: OTP VERIFICATION DIGIT MATRIX */
            <View style={styles.formContainer}>
              <View style={styles.headerBlock}>
                <View style={styles.portalTag}>
                  <Text style={styles.portalTagText}>Client Portal • Private Access</Text>
                </View>
                <Text style={styles.formTitle}>Verify Your Identity</Text>
                <Text style={styles.formSub}>
                  We sent a 6-digit authentication code to{' '}
                  <Text style={styles.boldContact}>{contact}</Text>. Enter the code below to access your private vaults.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setOtpSent(false);
                    setFeedback(null);
                  }}
                  style={styles.changeContactBtn}
                >
                  <Text style={styles.changeContactText}>Change destination</Text>
                  <StudioIcon name="arrow_forward" size={12} color={StudioTheme.colors.secondary} />
                </TouchableOpacity>
              </View>

              {/* 6 Discrete Digit Boxes Matrix */}
              <View style={styles.otpMatrix}>
                {otpDigits.map((digit, idx) => {
                  const isFilled = !!digit;
                  const isFocused = !isFilled && (idx === 0 || !!otpDigits[idx - 1]);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused,
                      ]}
                    >
                      <TextInput
                        ref={(ref) => { digitInputRefs.current[idx] = ref; }}
                        style={styles.otpDigitText}
                        value={digit}
                        onChangeText={(val) => handleOtpDigitChange(idx, val)}
                        onKeyPress={(e) => handleOtpKeyPress(idx, e)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                      />
                      {isFilled && <View style={styles.digitUnderline} />}
                    </View>
                  );
                })}
              </View>

              {/* Status Pill */}
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    otpDigits.every((d) => d) ? styles.statusDotActive : undefined,
                  ]}
                />
                <Text style={styles.statusPillText}>
                  {otpDigits.every((d) => d)
                    ? 'All digits ready'
                    : 'Awaiting remaining digits'}
                </Text>
              </View>

              {/* Verify Button */}
              <StudioButton
                label="Verify & Enter Vault"
                onPress={() => submitOtp(otpDigits.join(''))}
                loading={loading}
                disabled={otpDigits.some((d) => !d)}
                iconTrailingName="arrow_forward"
                size="lg"
              />

              {/* Resend Cooldown Countdown */}
              <View style={styles.resendBlock}>
                {!canResend && countdown > 0 ? (
                  <View style={styles.timerRow}>
                    <StudioIcon name="schedule" size={16} color={StudioTheme.colors.secondary} style={{ marginRight: 6 }} />
                    <Text style={styles.timerText}>
                      Resend code in <Text style={styles.timerNumber}>{formatTimer(countdown)}</Text>
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={loading}
                    style={styles.resendBtn}
                  >
                    <StudioIcon name="refresh" size={16} color={StudioTheme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.resendBtnText}>Resend Passcode</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Security & Archival Trust Proof */}
          <View style={styles.trustFooter}>
            <View style={styles.trustPill}>
              <StudioIcon name="verified_user" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.trustPillText}>256-Bit Encrypted Client Session</Text>
            </View>
            <Text style={styles.trustFootnote}>
              Private digital lookbooks are watermark-secured under signature copyright protocols.
            </Text>
          </View>

          {/* Legal Links */}
          <View style={styles.legalLinksRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://purusharthstudio.com/privacy').catch(() => {})}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://purusharthstudio.com/terms').catch(() => {})}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>•</Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:concierge@purusharthstudio.com').catch(() => {})}>
              <Text style={styles.legalLink}>Concierge</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.copyrightText}>
            Purusharth Studio Fine Art Cinematography &copy; 2026
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: StudioTheme.colors.surface,
  },
  container: {
    flex: 1,
    backgroundColor: StudioTheme.colors.surface,
  },
  scrollContainer: {
    paddingHorizontal: StudioTheme.spacing.marginMobile,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    padding: StudioTheme.spacing.lg,
    ...StudioTheme.shadows.level1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: StudioTheme.radius.lg,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  backButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
    marginLeft: 4,
  },
  homeLink: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  homeLinkText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.secondary,
    fontWeight: '600',
  },
  brandHero: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoRing: {
    width: 68,
    height: 68,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.hairline,
  },
  logoImg: {
    width: 52,
    height: 52,
    borderRadius: StudioTheme.radius.full,
  },
  logoBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.surfaceContainerLowest,
  },
  brandSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginTop: 10,
  },
  brandMotto: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    fontStyle: 'italic',
    color: StudioTheme.colors.onSurface,
    marginTop: 3,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: StudioTheme.colors.errorContainer,
  },
  feedbackSuccess: {
    backgroundColor: StudioTheme.colors.successSurface,
  },
  feedbackText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  feedbackTextError: {
    color: StudioTheme.colors.onErrorContainer,
  },
  feedbackTextSuccess: {
    color: StudioTheme.colors.success,
  },
  formContainer: {
    width: '100%',
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  portalTag: {
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: StudioTheme.radius.full,
    marginBottom: 8,
  },
  portalTagText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  formTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    textAlign: 'center',
  },
  formSub: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  boldContact: {
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
  },
  changeContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  changeContactText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: StudioTheme.colors.secondary,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 4,
    borderRadius: StudioTheme.radius.xl,
    marginBottom: 18,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: StudioTheme.radius.lg,
  },
  segmentBtnActive: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    ...StudioTheme.shadows.level1,
  },
  segmentText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '500',
    color: StudioTheme.colors.onSurfaceVariant,
  },
  segmentTextActive: {
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: StudioTheme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  labelBadge: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xl,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: StudioTheme.colors.onSurface,
    paddingVertical: 12,
  },
  codeFormat: {
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  inviteNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.secondaryContainer,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginTop: 8,
  },
  inviteNoticeText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSecondaryContainer,
    flex: 1,
    lineHeight: 16,
  },
  actionContainer: {
    marginTop: 10,
  },
  togglePasswordMode: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  togglePasswordModeText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.secondary,
    fontWeight: '600',
  },
  otpMatrix: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 16,
    width: '100%',
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 52,
    borderRadius: StudioTheme.radius.lg,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    position: 'relative',
  },
  otpBoxFilled: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderColor: StudioTheme.colors.onSurface,
  },
  otpBoxFocused: {
    borderColor: StudioTheme.colors.secondary,
    backgroundColor: StudioTheme.colors.surfaceBright,
  },
  otpDigitText: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    textAlign: 'center',
    width: '100%',
    height: '100%',
  },
  digitUnderline: {
    position: 'absolute',
    bottom: 6,
    width: 14,
    height: 2,
    backgroundColor: StudioTheme.colors.secondary,
    borderRadius: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.outline,
    marginRight: 6,
  },
  statusDotActive: {
    backgroundColor: StudioTheme.colors.success,
  },
  statusPillText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: StudioTheme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  resendBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  timerNumber: {
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: StudioTheme.radius.lg,
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
  },
  resendBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: StudioTheme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  trustFooter: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: StudioTheme.colors.hairline,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    marginBottom: 6,
  },
  trustPillText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  trustFootnote: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.outline,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  legalLink: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  legalDot: {
    color: StudioTheme.colors.outlineVariant,
  },
  copyrightText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
    textAlign: 'center',
    marginTop: 6,
  },
});

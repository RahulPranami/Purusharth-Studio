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
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { useAuth } from '@/context/auth-context';

export default function AdminLoginScreen() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();

  const [email, setEmail] = useState('rahulpranami101@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setStatusMessage('Please enter both your identifier and password.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Authenticating Director Clearance...');

    try {
      const res = await signInWithPassword(email, password);
      if (res.success) {
        setStatusMessage('Access Granted. Redirecting...');
        setTimeout(() => {
          router.replace('/admin' as any);
        }, 400);
      } else {
        setIsSubmitting(false);
        setStatusMessage(res.message || 'Invalid credentials. Please verify your credentials.');
      }
    } catch (e: any) {
      setIsSubmitting(false);
      setStatusMessage(e.message || 'Authentication error.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Editorial Header */}
        <View style={styles.header}>
          <View style={styles.emblemContainer}>
            <Image
              source={require('@/assets/images/studio-logo-transparent.png')}
              style={{ width: 160, height: 44 }}
              contentFit="contain"
            />
          </View>

          <Text style={styles.motto}>YOUR MOMENTS. YOUR MEMORIES.</Text>
          <Text style={styles.title}>Super Admin Console</Text>
          <Text style={styles.subtitle}>
            Secure login for Purusharth Studio Owner & Director.
          </Text>
        </View>

        {/* Form Body */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>STUDIO OWNER IDENTIFIER</Text>
            <View style={styles.inputWrapper}>
              <AdminIcon
                name="badge"
                size={18}
                color={AdminColors.outline}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="admin@purusharthstudio.com"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>MASTER PASSWORD</Text>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot Credentials?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <AdminIcon
                name="lock"
                size={18}
                color={AdminColors.outline}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••••••••••"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <AdminIcon
                  name={showPassword ? 'visibility_off' : 'visibility'}
                  size={18}
                  color={AdminColors.outline}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2FA Accordion Toggle */}
          <TouchableOpacity
            style={styles.twoFaToggle}
            onPress={() => setShow2FA(!show2FA)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AdminIcon
                name="verified_user"
                size={18}
                color={AdminColors.secondary}
              />
              <Text style={styles.twoFaToggleText}>
                Hardware Token / 2FA Authenticator
              </Text>
            </View>
            <AdminIcon
              name={show2FA ? 'expand_less' : 'expand_more'}
              size={18}
              color={AdminColors.outline}
            />
          </TouchableOpacity>

          {show2FA && (
            <View style={styles.twoFaField}>
              <View style={styles.inputWrapper}>
                <AdminIcon
                  name="key"
                  size={18}
                  color={AdminColors.outline}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { letterSpacing: 2 }]}
                  placeholder="Enter 6-digit passcode or YubiKey tap"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={8}
                />
              </View>
            </View>
          )}

          {/* Remember Me */}
          <View style={styles.rememberRow}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}
              >
                {rememberMe && (
                  <AdminIcon name="check" size={14} color="#ffffff" />
                )}
              </View>
              <Text style={styles.rememberText}>Remember this workstation</Text>
            </TouchableOpacity>

            <View style={styles.vaultPill}>
              <Text style={styles.vaultPillText}>Vault v4.2</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              isSubmitting && styles.submitBtnSubmitting,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.submitBtnText}>{statusMessage}</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.submitBtnText}>
                  Sign In to Super Admin Dashboard
                </Text>
                <AdminIcon name="arrow_forward" size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Mainframe Grid Status */}
        <View style={styles.statusBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.statusDot} />
            <View>
              <Text style={styles.statusLabel}>MAINFRAME GRID</Text>
              <Text style={styles.statusValue}>Production Ingest Active</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statusLabel}>ROLE CLEARANCE</Text>
            <Text style={styles.clearanceValue}>Tier 0 Super Admin</Text>
          </View>
        </View>

        {/* Security Footer */}
        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AdminIcon name="encrypted" size={15} color={AdminColors.secondary} />
            <Text style={styles.encryptionText}>
              256-BIT ENCRYPTED SESSION • MASTER INGESTION GATE
            </Text>
          </View>
          <Text style={styles.copyrightText}>
            © Purusharth Studio. High-fidelity archival curation & cinematography.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbf9f4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 36,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 24,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emblemContainer: {
    marginBottom: 16,
  },
  emblemBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: AdminColors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: AdminColors.surfaceVariant,
  },
  motto: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.onSurface,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: AdminColors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  forgotLink: {
    fontSize: 11.5,
    color: AdminColors.primary,
    fontWeight: '500',
  },
  inputWrapper: {
    height: 44,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    position: 'relative',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: AdminColors.onSurface,
    outlineWidth: 0 as any,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
  twoFaToggle: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  twoFaToggleText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  twoFaField: {
    marginTop: -4,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: AdminColors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  rememberText: {
    fontSize: 12.5,
    color: AdminColors.secondary,
  },
  vaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainer,
  },
  vaultPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.onSurfaceVariant,
  },
  submitBtn: {
    height: 48,
    borderRadius: 10,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AdminColors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
    marginTop: 6,
  },
  submitBtnSubmitting: {
    backgroundColor: AdminColors.secondary,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  statusBox: {
    marginTop: 24,
    padding: 12,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  statusValue: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  clearanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  encryptionText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  copyrightText: {
    fontSize: 11,
    color: AdminColors.outline,
    textAlign: 'center',
  },
});

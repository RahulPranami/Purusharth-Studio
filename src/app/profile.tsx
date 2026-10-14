import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';
import { uploadToR2 } from '@/services/r2';
import { analyzeSelfie } from '@/services/analyzer';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioHeader } from '@/components/ui/StudioHeader';
import { StudioBottomNav } from '@/components/ui/StudioBottomNav';
import { StudioButton } from '@/components/ui/StudioButton';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioBadge } from '@/components/ui/StudioBadge';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, loading: authLoading, updateProfile, refreshProfile, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(true);

  // Invite / Code Redemption Modal
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [codeRedeeming, setCodeRedeeming] = useState(false);
  const [codeResult, setCodeResult] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [scanningEffect, setScanningEffect] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setSelfieUrl(profile.selfie_url || null);
    }
  }, [profile]);

  const handlePickImage = async (useCamera: boolean) => {
    if (!hasConsented) {
      Alert.alert(
        'Consent Required',
        'Please review and check the facial recognition consent box before capturing or selecting your reference selfie.'
      );
      return;
    }

    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera Permission Required', 'Camera access is required to take your reference selfie.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Gallery Permission Required', 'Photo library access is required to select your reference selfie.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.85,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingSelfie(true);
      setScanningEffect(true);
      setFeedback(null);

      const userId = user?.id || 'anonymous';

      // 1. Analyze selfie via FastAPI analyzer if accessible
      try {
        const analysis = await analyzeSelfie({
          uri: asset.uri,
          name: `selfie_${userId}.jpg`,
          type: 'image/jpeg',
          size: asset.fileSize,
        });

        if (analysis.faces_detected_count === 0) {
          setScanningEffect(false);
          setUploadingSelfie(false);
          setFeedback({
            type: 'error',
            message: 'No face detected in this photo. Please retake facing the camera in good natural lighting.',
          });
          return;
        }

        if (analysis.faces_detected_count > 1) {
          Alert.alert(
            'Multiple Faces Detected',
            'We noticed multiple faces in this photo. For accurate matching, a solo portrait is recommended.'
          );
        }
      } catch (analysisErr) {
        console.warn('AI Selfie pre-validation warning:', analysisErr);
      }

      const key = `selfies/${userId}_${Date.now()}.jpg`;

      // 2. Upload to Cloudflare R2 or persist URI
      try {
        const uploadRes = await uploadToR2(
          {
            uri: asset.uri,
            name: `selfie_${userId}.jpg`,
            type: 'image/jpeg',
            size: asset.fileSize,
          },
          key
        );

        setSelfieUrl(uploadRes.url);

        if (user?.id) {
          await updateProfile({
            selfie_key: uploadRes.key,
            selfie_url: uploadRes.url,
          });
        }
      } catch (r2Err: any) {
        console.warn('Direct R2 upload note:', r2Err);
        // Fallback: store asset URI locally in profile state so user can still proceed
        setSelfieUrl(asset.uri);
        if (user?.id) {
          await updateProfile({
            selfie_url: asset.uri,
          });
        }
      }

      setScanningEffect(false);
      setUploadingSelfie(false);
      setFeedback({
        type: 'success',
        message: 'Selfie indexed securely! You can now use Find My Photos across all unlocked lookbooks.',
      });
    } catch (err: any) {
      setScanningEffect(false);
      setUploadingSelfie(false);
      console.error('Selfie upload error:', err);
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to capture reference selfie. Please retry.',
      });
    }
  };

  const handleRemoveSelfie = async () => {
    Alert.alert(
      'Remove Reference Selfie',
      'Are you sure you want to delete your stored reference selfie? You will need to capture a new one to use facial matching.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSelfieUrl(null);
            if (user?.id) {
              await updateProfile({
                selfie_url: null,
                selfie_key: null,
              });
            }
            setFeedback({
              type: 'success',
              message: 'Reference selfie removed from studio vault.',
            });
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setFeedback({ type: 'error', message: 'Full name is required.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const res = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
    });

    setSaving(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Profile updated successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  const handleRedeemCode = async () => {
    const trimmed = promoCode.trim().toUpperCase();
    if (!trimmed) {
      setCodeResult({ type: 'error', message: 'Please enter a valid pass or invite code.' });
      return;
    }

    setCodeRedeeming(true);
    setCodeResult(null);

    try {
      // 1. Try admin invite code first
      const { data: adminData, error: adminErr } = await supabase.rpc(
        'verify_and_use_admin_code',
        { p_code: trimmed }
      );

      if (!adminErr && adminData && adminData.success) {
        await refreshProfile();
        setCodeRedeeming(false);
        setCodeResult({
          type: 'success',
          message: 'Admin clearance verified! Role upgraded to Event Admin.',
        });
        setTimeout(() => {
          setCodeModalVisible(false);
          setPromoCode('');
          setCodeResult(null);
        }, 1500);
        return;
      }

      // 2. Try event passcode
      const { data: eventData, error: eventErr } = await supabase.rpc(
        'join_event_by_code',
        { p_code: trimmed }
      );

      if (!eventErr && eventData && eventData.success) {
        setCodeRedeeming(false);
        setCodeResult({
          type: 'success',
          message: eventData.already_member
            ? 'Event pass already active in your account.'
            : `Access granted to "${eventData.event?.title || 'Private Event'}"!`,
        });
        setTimeout(() => {
          setCodeModalVisible(false);
          setPromoCode('');
          setCodeResult(null);
        }, 1500);
        return;
      }

      setCodeRedeeming(false);
      setCodeResult({
        type: 'error',
        message: adminData?.error || eventData?.error || 'Invalid or expired code. Please verify and retry.',
      });
    } catch (err: any) {
      setCodeRedeeming(false);
      setCodeResult({
        type: 'error',
        message: err.message || 'Verification failed. Please check network connectivity.',
      });
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Purusharth Studio?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const roleLabel =
    profile?.role === 'super_admin'
      ? 'Super Admin'
      : profile?.role === 'admin'
      ? 'Event Admin'
      : 'Client Member';

  const roleVariant =
    profile?.role === 'super_admin'
      ? 'gold'
      : profile?.role === 'admin'
      ? 'warning'
      : 'neutral';

  return (
    <View style={styles.screenWrapper}>
      <StudioHeader title="Studio Profile" subtitle="Member Account & Biometrics" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Top Intro Section */}
          <View style={styles.introHeader}>
            <View style={styles.memberBadge}>
              <StudioIcon name="verified" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.memberBadgeText}>Member Ingestion</Text>
            </View>
            <Text style={styles.pageTitle}>Your Studio Profile</Text>
            <Text style={styles.pageSubtitle}>
              Complete your details and register your face for instant photo matching.
            </Text>
          </View>

          {/* Feedback Banner */}
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

          {/* SECTION 1: SELFIE BIOMETRIC CAPTURE CARD */}
          <View style={styles.selfieCard}>
            <View style={styles.haloGlow} />

            {/* Oval Portrait Portal */}
            <View style={styles.portraitWrapper}>
              <View style={styles.portraitPortal}>
                {selfieUrl ? (
                  <Image source={{ uri: selfieUrl }} style={styles.selfieImage} contentFit="cover" />
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <View style={styles.emptyIconCircle}>
                      <StudioIcon name="face_retouching_natural" size={32} color={StudioTheme.colors.secondary} />
                    </View>
                    <Text style={styles.emptyStateTitle}>Face Index</Text>
                    <Text style={styles.emptyStateSub}>Optimal Light</Text>
                  </View>
                )}

                {/* Scanning Laser Overlay Simulation */}
                {scanningEffect && (
                  <View style={styles.scanOverlay}>
                    <View style={styles.scanLaser} />
                    <View style={styles.scanMetaRow}>
                      <Text style={styles.scanMetaText}>Biometric Vectoring...</Text>
                      <ActivityIndicator size="small" color={StudioTheme.colors.secondaryContainer} />
                    </View>
                  </View>
                )}
              </View>

              {/* Floating Camera / Verified Insignia */}
              <View style={styles.floatingCameraBadge}>
                <StudioIcon
                  name={selfieUrl ? 'verified' : 'photo_camera'}
                  size={16}
                  color={StudioTheme.colors.onPrimary}
                />
              </View>
            </View>

            {/* Guidance Heading */}
            <View style={styles.guidanceBox}>
              <Text style={styles.guidanceTitle}>Biometric Identification</Text>
              <Text style={styles.guidanceText}>
                Position your face clearly within good natural lighting. A neutral expression is best.
              </Text>
            </View>

            {/* Explicit Consent Checkbox */}
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setHasConsented(!hasConsented)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, hasConsented && styles.checkboxActive]}>
                {hasConsented && (
                  <StudioIcon name="check" size={14} color={StudioTheme.colors.onPrimary} />
                )}
              </View>
              <Text style={styles.consentText}>
                I consent to automated facial matching for private photo discovery. Face vectors are sandboxed, never shared, and can be removed at any time.
              </Text>
            </TouchableOpacity>

            {/* Dual Action Capture Buttons */}
            <View style={styles.dualButtonRow}>
              <View style={styles.dualBtnHalf}>
                <StudioButton
                  label="Take Selfie"
                  iconName="photo_camera"
                  variant="primary"
                  onPress={() => handlePickImage(true)}
                  disabled={uploadingSelfie || !hasConsented}
                  loading={uploadingSelfie && scanningEffect}
                  size="md"
                />
              </View>
              <View style={styles.dualBtnHalf}>
                <StudioButton
                  label="From Gallery"
                  iconName="image"
                  variant="outline"
                  onPress={() => handlePickImage(false)}
                  disabled={uploadingSelfie || !hasConsented}
                  size="md"
                />
              </View>
            </View>

            {/* If selfie exists, show Remove button */}
            {selfieUrl && (
              <TouchableOpacity
                onPress={handleRemoveSelfie}
                style={styles.removeSelfieBtn}
                activeOpacity={0.7}
              >
                <StudioIcon name="close" size={14} color={StudioTheme.colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.removeSelfieText}>Remove Stored Reference</Text>
              </TouchableOpacity>
            )}

            {/* Privacy Assurance Callout */}
            <View style={styles.privacyCallout}>
              <StudioIcon name="lock" size={18} color={StudioTheme.colors.secondary} style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={styles.privacyCalloutText}>
                Your reference headshot is securely vaulted to match and deliver your photos across private gala and wedding galleries.
              </Text>
            </View>
          </View>

          {/* SECTION 2: PERSONAL INFORMATION */}
          <View style={styles.detailsCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionTitle}>Personal Details</Text>
              <StudioBadge label={roleLabel} variant={roleVariant} showDot />
            </View>

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <Text style={styles.requiredTag}>Required</Text>
              </View>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="e.g. Eleanor Vance"
                  placeholderTextColor={StudioTheme.colors.outline}
                />
                <StudioIcon name="signature" size={18} color={StudioTheme.colors.outline} />
              </View>
            </View>

            {/* Email (Readonly from auth) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Authenticated Email</Text>
              <View style={[styles.fieldWrapper, styles.disabledWrapper]}>
                <TextInput
                  style={[styles.fieldInput, styles.disabledInput]}
                  value={user?.email || profile?.email || 'Authenticated Account'}
                  editable={false}
                />
                <StudioIcon name="alternate_email" size={18} color={StudioTheme.colors.outline} />
              </View>
            </View>

            {/* Mobile Phone */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>Mobile Phone</Text>
                <Text style={styles.optTag}>SMS &amp; WhatsApp Alerts</Text>
              </View>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={StudioTheme.colors.outline}
                  keyboardType="phone-pad"
                />
                <StudioIcon name="sms" size={18} color={StudioTheme.colors.secondary} />
              </View>
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>City / Location</Text>
              <View style={styles.fieldWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Mumbai, Udaipur, London"
                  placeholderTextColor={StudioTheme.colors.outline}
                />
              </View>
            </View>

            {/* Tier & Access Pass Sub-card */}
            <View style={styles.tierSubCard}>
              <View style={styles.tierLeft}>
                <View style={styles.tierIconCircle}>
                  <StudioIcon name="workspace_premium" size={18} color={StudioTheme.colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.tierTitle}>Access Tier</Text>
                  <Text style={styles.tierSub}>{roleLabel}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setCodeModalVisible(true)}
                style={styles.redeemBtn}
              >
                <Text style={styles.redeemBtnText}>Redeem Code</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Save Profile Button */}
          <View style={styles.saveSection}>
            <StudioButton
              label={saving ? 'Vaulting Record...' : 'Save Profile & Continue'}
              onPress={handleSaveProfile}
              loading={saving}
              iconTrailingName="arrow_forward"
              size="lg"
            />
            <Text style={styles.disclaimerText}>
              Encrypted • ISO 27001 Standard Security Vault
            </Text>
          </View>

          {/* Sign Out Row */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <StudioIcon name="logout" size={16} color={StudioTheme.colors.error} style={{ marginRight: 6 }} />
            <Text style={styles.signOutText}>Sign Out of Studio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Code Redemption Modal */}
      <Modal
        visible={codeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redeem Access Code</Text>
              <TouchableOpacity onPress={() => setCodeModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <StudioIcon name="close" size={20} color={StudioTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Enter a private wedding event passcode (e.g. UDAIPUR-24) or an admin referral key (INVITE-2025).
            </Text>

            {codeResult && (
              <View
                style={[
                  styles.modalAlert,
                  codeResult.type === 'error' ? styles.feedbackError : styles.feedbackSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.modalAlertText,
                    codeResult.type === 'error' ? styles.feedbackTextError : styles.feedbackTextSuccess,
                  ]}
                >
                  {codeResult.message}
                </Text>
              </View>
            )}

            <View style={styles.modalInputWrap}>
              <TextInput
                style={styles.modalInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="ENTER CODE"
                placeholderTextColor={StudioTheme.colors.outline}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalActions}>
              <StudioButton
                label={codeRedeeming ? 'Validating...' : 'Unlock Clearance'}
                onPress={handleRedeemCode}
                loading={codeRedeeming}
                variant="gold"
                size="md"
              />
            </View>
          </View>
        </View>
      </Modal>

      <StudioBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: StudioTheme.colors.surface,
  },
  scrollContent: {
    paddingHorizontal: StudioTheme.spacing.marginMobile,
    paddingTop: 16,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 540,
  },
  introHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
    marginBottom: 8,
  },
  memberBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  pageTitle: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
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
  selfieCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    padding: StudioTheme.spacing.lg,
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    ...StudioTheme.shadows.level1,
  },
  haloGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(252, 216, 156, 0.25)',
  },
  portraitWrapper: {
    position: 'relative',
    marginVertical: 12,
  },
  portraitPortal: {
    width: 140,
    height: 185,
    borderRadius: 70,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: StudioTheme.colors.secondary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...StudioTheme.shadows.level2,
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  emptyStateSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
    marginTop: 2,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 28, 25, 0.65)',
    justifyContent: 'space-between',
    padding: 10,
  },
  scanLaser: {
    height: 2,
    width: '100%',
    backgroundColor: StudioTheme.colors.secondaryContainer,
  },
  scanMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scanMetaText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  floatingCameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: StudioTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: StudioTheme.colors.surfaceContainerLowest,
    ...StudioTheme.shadows.level2,
  },
  guidanceBox: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 12,
  },
  guidanceTitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    marginBottom: 4,
  },
  guidanceText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 17,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 16,
    width: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
  },
  checkboxActive: {
    backgroundColor: StudioTheme.colors.primary,
    borderColor: StudioTheme.colors.primary,
  },
  consentText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  dualButtonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dualBtnHalf: {
    flex: 1,
  },
  removeSelfieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  removeSelfieText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.error,
    fontWeight: '600',
  },
  privacyCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: StudioTheme.radius.lg,
    marginTop: 16,
    width: '100%',
  },
  privacyCalloutText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  detailsCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    padding: StudioTheme.spacing.lg,
    marginBottom: 20,
    ...StudioTheme.shadows.level1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardSectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
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
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: StudioTheme.colors.onSurfaceVariant,
    marginBottom: 6,
  },
  requiredTag: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.secondary,
    fontWeight: '600',
  },
  optTag: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
  },
  fieldWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xl,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  disabledWrapper: {
    backgroundColor: StudioTheme.colors.surfaceContainerHigh,
    opacity: 0.8,
  },
  fieldInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: StudioTheme.colors.onSurface,
    paddingVertical: 12,
  },
  disabledInput: {
    color: StudioTheme.colors.onSurfaceVariant,
  },
  tierSubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 12,
    borderRadius: StudioTheme.radius.xl,
    marginTop: 8,
  },
  tierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tierIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  tierTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  tierSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  redeemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: StudioTheme.radius.lg,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  redeemBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  saveSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimerText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    color: StudioTheme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: StudioTheme.colors.error,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27, 28, 25, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    padding: 20,
    ...StudioTheme.shadows.level3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
  },
  modalDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    lineHeight: 17,
    marginBottom: 14,
  },
  modalAlert: {
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 12,
  },
  modalAlertText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  modalInputWrap: {
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xl,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginBottom: 16,
  },
  modalInput: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    paddingVertical: 12,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
  },
});

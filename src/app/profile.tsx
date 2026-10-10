import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth-context';
import { uploadToR2 } from '@/services/r2';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, loading: authLoading, updateProfile, signOut } = useAuth();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 10
    : Math.max(insets.top, 12);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setPhone(profile.phone || '');
      setCity(profile.city || '');
      setSelfieUrl(profile.selfie_url || null);
    }
  }, [profile]);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera Permission', 'Camera access is required to take a biometric selfie.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Gallery Permission', 'Gallery access is required to select a photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingSelfie(true);
      setFeedback(null);

      const userId = user?.id || 'anonymous';
      const key = `selfies/${userId}_${Date.now()}.jpg`;

      // Upload directly to Cloudflare R2
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

      // Save to Supabase
      if (user?.id) {
        await updateProfile({
          selfie_key: uploadRes.key,
          selfie_url: uploadRes.url,
        });
      }

      setUploadingSelfie(false);
      setFeedback({
        type: 'success',
        message: 'Biometric selfie indexed and uploaded to private studio storage!',
      });
    } catch (err: any) {
      setUploadingSelfie(false);
      console.error('Selfie upload error:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to upload selfie.' });
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setFeedback({ type: 'error', message: 'Full Name cannot be empty.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const res = await updateProfile({
      display_name: displayName.trim(),
      phone: phone.trim(),
      city: city.trim(),
    });

    setSaving(false);
    if (res.success) {
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to update profile.' });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1B1C19" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} style={styles.container}>
      <View style={styles.contentWrap}>
        {/* Navigation Bar */}
        <View style={[styles.navBar, { paddingTop: topInset }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Lookbook</Text>
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>Purusharth Studio</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Intro */}
        <View style={styles.introHeader}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>MEMBER INGESTION</Text>
          </View>
          <Text style={styles.title}>Your Studio Profile</Text>
          <Text style={styles.subTitle}>
            Register your face for instant photo matching across private galas and lookbooks.
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

        {/* Biometric Capture Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Biometric Identification</Text>
          <Text style={styles.cardHeaderSub}>
            Position your face clearly within good light. Neutral expression is best.
          </Text>

          {/* Oval Framing */}
          <View style={styles.ovalWrapper}>
            <View style={styles.ovalHalo} />
            <View style={styles.ovalPortal}>
              {uploadingSelfie ? (
                <View style={styles.ovalPlaceholder}>
                  <ActivityIndicator size="large" color="#755A2A" />
                  <Text style={styles.uploadingText}>Indexing Face...</Text>
                </View>
              ) : selfieUrl ? (
                <Image source={{ uri: selfieUrl }} style={styles.selfieImage} resizeMode="cover" />
              ) : (
                <View style={styles.ovalPlaceholder}>
                  <Text style={styles.faceIconText}>👤</Text>
                  <Text style={styles.ovalPlaceholderText}>Face Index Empty</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={() => handlePickImage(true)}
              disabled={uploadingSelfie}
            >
              <Text style={styles.actionBtnPrimaryText}>Take Selfie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => handlePickImage(false)}
              disabled={uploadingSelfie}
            >
              <Text style={styles.actionBtnSecondaryText}>From Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityNoteText}>
              🔒 Your selfie is securely stored in private Cloudflare R2 to automatically deliver your photos across wedding and event galleries.
            </Text>
          </View>
        </View>

        {/* Personal Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardHeaderTitle}>Personal Details</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>
                {profile?.role === 'super_admin' || profile?.role === 'admin'
                  ? 'VIP MEMBER'
                  : 'CLIENT MEMBER'}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name (Required)</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your Full Name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City / Location</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="e.g. Mumbai, New Delhi, Udaipur"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBF9F4',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 60,
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 600,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backButton: {
    padding: 6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#755A2A',
    fontWeight: '600',
  },
  brandRow: {
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1C19',
  },
  signOutButton: {
    padding: 6,
  },
  signOutText: {
    fontSize: 13,
    color: '#BA1A1A',
    fontWeight: '500',
  },
  introHeader: {
    alignItems: 'center',
    marginVertical: 16,
    textAlign: 'center',
  },
  badgePill: {
    backgroundColor: '#EAE8E3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#755A2A',
    letterSpacing: 0.8,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
    fontSize: 26,
    fontWeight: '600',
    color: '#1B1C19',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 18,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 12,
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
    textAlign: 'center',
  },
  feedbackTextError: {
    color: '#DC2626',
  },
  feedbackTextSuccess: {
    color: '#059669',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1C19',
  },
  cardHeaderSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
  },
  rolePill: {
    backgroundColor: '#FCD89C',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#775D2D',
    letterSpacing: 0.6,
  },
  ovalWrapper: {
    alignItems: 'center',
    marginVertical: 14,
  },
  ovalHalo: {
    position: 'absolute',
    width: 160,
    height: 210,
    borderRadius: 45,
    backgroundColor: '#FCD89C',
    opacity: 0.35,
  },
  ovalPortal: {
    width: 144,
    height: 192,
    borderRadius: 40,
    backgroundColor: '#F5F3EE',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E4E2DD',
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  ovalPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  faceIconText: {
    fontSize: 36,
    marginBottom: 6,
  },
  ovalPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8B6F5D',
    textTransform: 'uppercase',
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#755A2A',
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#1B1C19',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#F5F3EE',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4E2DD',
  },
  actionBtnSecondaryText: {
    color: '#1B1C19',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  securityNote: {
    backgroundColor: '#FBF9F4',
    padding: 10,
    borderRadius: 10,
  },
  securityNoteText: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  saveButton: {
    backgroundColor: '#1B1C19',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

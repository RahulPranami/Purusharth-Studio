import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useWindowDimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';
import { matchSelfieWithEvent, PhotoMatch } from '@/services/analyzer';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioHeader } from '@/components/ui/StudioHeader';
import { StudioBottomNav } from '@/components/ui/StudioBottomNav';
import { StudioButton } from '@/components/ui/StudioButton';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioBadge } from '@/components/ui/StudioBadge';

const UNLOCKED_EVENTS_KEY = '@purusharth_unlocked_events';

interface EventOption {
  id: string;
  title: string;
  total_photos: number;
}

export default function FindPhotosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>('Select an Event');
  const [eventSelectorVisible, setEventSelectorVisible] = useState(false);

  // Selfie State
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [hasConsented, setHasConsented] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [scanStatusText, setScanStatusText] = useState<string>('');

  // Results State
  const [matchedPhotos, setMatchedPhotos] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Lightbox Modal
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  // Load events
  useEffect(() => {
    async function fetchEvents() {
      try {
        let list: EventOption[] = [];
        const savedJson = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
        if (savedJson) {
          list = JSON.parse(savedJson);
        }

        // Also fetch from Supabase
        const { data: publicEvents } = await supabase
          .from('events')
          .select('id, title, total_photos')
          .eq('status', 'active');

        if (publicEvents) {
          publicEvents.forEach((ev: any) => {
            if (!list.some((item) => item.id === ev.id)) {
              list.push({
                id: ev.id,
                title: ev.title,
                total_photos: ev.total_photos || 0,
              });
            }
          });
        }

        setEvents(list);

        // Determine default event
        if (params.eventId && list.some((e) => e.id === params.eventId)) {
          const found = list.find((e) => e.id === params.eventId);
          setSelectedEventId(found!.id);
          setSelectedEventTitle(found!.title);
        } else if (list.length > 0) {
          setSelectedEventId(list[0].id);
          setSelectedEventTitle(list[0].title);
        }
      } catch (e) {
        console.warn('Error loading events for find photos:', e);
      }
    }

    fetchEvents();

    // Use profile selfie by default if available
    if (profile?.selfie_url) {
      setSelfieUri(profile.selfie_url);
    }
  }, [params.eventId, profile?.selfie_url]);

  const handleSelectImage = async (useCamera: boolean) => {
    if (!hasConsented) {
      Alert.alert(
        'Consent Required',
        'Please review and check the biometric matching consent box before proceeding.'
      );
      return;
    }

    try {
      let result: ImagePicker.ImagePickerResult;

      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Camera Permission Required', 'Camera access is required to take your selfie.');
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
          Alert.alert('Gallery Permission Required', 'Photo library access is required to select a photo.');
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
      setSelfieUri(asset.uri);
      setHasSearched(false);
      setMatches([]);
      setMatchedPhotos([]);
      setSearchError(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to select image.');
    }
  };

  const handleStartScan = async () => {
    if (!selfieUri) {
      Alert.alert('Photo Needed', 'Please capture or upload a selfie first to match against event photos.');
      return;
    }
    if (!selectedEventId) {
      Alert.alert('Select Event', 'Please select an event collection to search.');
      return;
    }
    if (!hasConsented) {
      Alert.alert('Consent Required', 'Please confirm biometric consent before searching.');
      return;
    }

    setAnalyzing(true);
    setSearchError(null);
    setScanStatusText('Connecting to facial recognition indexer...');

    try {
      // 1. Fetch event photos from Supabase media table
      setScanStatusText('Cataloging event photo vault...');
      const { data: mediaRows, error: mediaErr } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', selectedEventId)
        .eq('status', 'ready');

      if (mediaErr) {
        throw mediaErr;
      }

      if (!mediaRows || mediaRows.length === 0) {
        setAnalyzing(false);
        setHasSearched(true);
        setMatches([]);
        setMatchedPhotos([]);
        setSearchError('No indexed media found in this event collection yet.');
        return;
      }

      setScanStatusText(`Analyzing ${mediaRows.length} high-res captures...`);

      // 2. Call Face Vector Analyzer
      const result = await matchSelfieWithEvent({
        fileInput: {
          uri: selfieUri,
          name: 'scan_reference.jpg',
          type: 'image/jpeg',
        },
        collectionScope: selectedEventId,
        threshold: 0.40,
      });

      setAnalyzing(false);
      setHasSearched(true);

      if (result && Array.isArray(result.top_matches) && result.top_matches.length > 0) {
        // Map matches to full media objects
        const matchMap = new Map<string, number>();
        result.top_matches.forEach((m: PhotoMatch) => {
          matchMap.set(m.image_key, m.best_similarity);
        });

        const matchedList = mediaRows
          .filter((m: any) => matchMap.has(m.object_key))
          .map((m: any) => ({
            ...m,
            similarity: matchMap.get(m.object_key) || 0.8,
          }))
          .sort((a, b) => b.similarity - a.similarity);

        setMatchedPhotos(matchedList);
      } else {
        setMatchedPhotos([]);
        setSearchError(
          'No matching facial portraits located in this event with current similarity threshold. Try another selfie or browse the full gallery.'
        );
      }
    } catch (err: any) {
      setAnalyzing(false);
      setHasSearched(true);
      console.warn('Find photos analysis error:', err);
      setSearchError(
        'Facial search service is currently unavailable. Your event gallery remains fully accessible.'
      );
    }
  };

  const numColumns = width >= 768 ? 3 : 2;

  return (
    <View style={styles.screenWrapper}>
      <StudioHeader title="Find My Photos" subtitle="AI Facial Indexing" showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Active Collection Selector */}
          <View style={styles.scopeBar}>
            <View style={styles.scopeLeft}>
              <StudioIcon name="stars" size={20} color={StudioTheme.colors.secondary} style={{ marginRight: 8 }} />
              <View style={styles.scopeInfo}>
                <Text style={styles.scopeLabel}>Active Collection</Text>
                <Text style={styles.scopeTitle} numberOfLines={1}>
                  {selectedEventTitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setEventSelectorVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.switchBtnText}>Switch</Text>
              <StudioIcon name="unfold_more" size={14} color={StudioTheme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Editorial Hero Intro */}
          <View style={styles.introBox}>
            <Text style={styles.introEyebrow}>AI Assisted Archival Search</Text>
            <Text style={styles.introHeading}>Instant Face Match</Text>
            <Text style={styles.introDesc}>
              Upload or take a quick selfie to automatically discover every portrait and candid moment you grace across your authorized event lookbooks.
            </Text>
          </View>

          {/* Viewfinder / Interaction Card */}
          <View style={styles.viewfinderCard}>
            <View style={styles.glowBackdrop} />

            {/* Oval Portrait Targeting Guide */}
            <View style={styles.ovalGuideWrapper}>
              <View style={styles.ovalHalo} />

              <View style={styles.ovalPortal}>
                {selfieUri ? (
                  <Image source={{ uri: selfieUri }} style={styles.portalImage} contentFit="cover" />
                ) : (
                  <View style={styles.emptyViewfinder}>
                    <View style={styles.apertureIconCircle}>
                      <StudioIcon name="shutter_speed" size={28} color={StudioTheme.colors.secondary} />
                    </View>
                    <Text style={styles.viewfinderLabel}>Face Guide</Text>
                    <Text style={styles.viewfinderSub}>Optimal Light</Text>
                  </View>
                )}

                {/* Corner markers */}
                <View style={[styles.cornerDot, styles.dotTL]} />
                <View style={[styles.cornerDot, styles.dotTR]} />
                <View style={[styles.cornerDot, styles.dotBL]} />
                <View style={[styles.cornerDot, styles.dotBR]} />
              </View>
            </View>

            {/* Guidance note */}
            <View style={styles.guidanceRow}>
              <StudioIcon name="wb_sunny" size={16} color={StudioTheme.colors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.guidanceText}>Center your face in good, natural lighting</Text>
            </View>

            {/* Dual Action Buttons */}
            <View style={styles.captureButtonsRow}>
              <View style={styles.btnHalf}>
                <StudioButton
                  label="Take Photo"
                  iconName="photo_camera"
                  variant="primary"
                  onPress={() => handleSelectImage(true)}
                  size="md"
                />
              </View>
              <View style={styles.btnHalf}>
                <StudioButton
                  label="From Library"
                  iconName="image"
                  variant="outline"
                  onPress={() => handleSelectImage(false)}
                  size="md"
                />
              </View>
            </View>

            {/* Consent Box */}
            <TouchableOpacity
              style={styles.consentBox}
              onPress={() => setHasConsented(!hasConsented)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, hasConsented && styles.checkboxActive]}>
                {hasConsented && (
                  <StudioIcon name="check" size={14} color={StudioTheme.colors.onPrimary} />
                )}
              </View>
              <Text style={styles.consentDisclaimer}>
                I consent to automated facial matching for photo discovery. Biometric embeddings are volatile, privacy-sandboxed, and never shared or retained.
              </Text>
            </TouchableOpacity>

            {/* Primary High-Touch Scan Button */}
            <View style={styles.scanButtonContainer}>
              <StudioButton
                label={analyzing ? scanStatusText || 'Matching Faces...' : 'Scan & Find My Photos'}
                onPress={handleStartScan}
                loading={analyzing}
                variant="gold"
                iconTrailingName="auto_awesome"
                size="lg"
              />
              <Text style={styles.scanMetaDisclaimer}>
                Instant lookbook indexing across high-resolution curated captures
              </Text>
            </View>
          </View>

          {/* Privacy & Sandboxing Banner */}
          <View style={styles.privacyBanner}>
            <View style={styles.shieldIconCircle}>
              <StudioIcon name="verified_user" size={18} color={StudioTheme.colors.secondary} />
            </View>
            <View style={styles.privacyContent}>
              <View style={styles.privacyTitleRow}>
                <Text style={styles.privacyTitle}>Private &amp; Sandboxed</Text>
                <View style={styles.privacyDot} />
              </View>
              <Text style={styles.privacyDesc}>
                Biometric face vectors are processed in temporary volatile memory and never permanently trained on or shared outside this studio session.
              </Text>
            </View>
          </View>

          {/* RESULTS SECTION */}
          {hasSearched && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeaderRow}>
                <View>
                  <Text style={styles.resultsEyebrow}>INDEXING RESULTS</Text>
                  <Text style={styles.resultsHeading}>
                    {matchedPhotos.length > 0
                      ? `${matchedPhotos.length} Photos Found With You`
                      : 'No Matching Photos'}
                  </Text>
                </View>
                {matchedPhotos.length > 0 && (
                  <StudioBadge label="AI Matched" variant="gold" showDot />
                )}
              </View>

              {searchError && (
                <View style={styles.searchErrorBox}>
                  <StudioIcon name="info" size={18} color={StudioTheme.colors.warning} style={{ marginRight: 8 }} />
                  <Text style={styles.searchErrorText}>{searchError}</Text>
                </View>
              )}

              {matchedPhotos.length === 0 && !searchError && (
                <View style={styles.noMatchesBox}>
                  <StudioIcon name="photo_camera" size={36} color={StudioTheme.colors.outline} />
                  <Text style={styles.noMatchesTitle}>No matching portraits detected</Text>
                  <Text style={styles.noMatchesText}>
                    We did not locate high-confidence matches in this particular event. Try taking another selfie with closer framing and direct lighting, or browse the entire gallery.
                  </Text>
                  <View style={{ marginTop: 14 }}>
                    <StudioButton
                      label="Browse Full Gallery"
                      variant="outline"
                      onPress={() => router.push(`/event/${selectedEventId}` as any)}
                      size="sm"
                    />
                  </View>
                </View>
              )}

              {/* Matched Photos Grid */}
              {matchedPhotos.length > 0 && (
                <View style={styles.gridContainer}>
                  {matchedPhotos.map((photo, idx) => (
                    <TouchableOpacity
                      key={photo.id || idx}
                      style={[styles.gridItem, { width: `${100 / numColumns - 2}%` }]}
                      onPress={() => setLightboxPhoto(photo)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: photo.url }} style={styles.photoImg} contentFit="cover" />
                      <View style={styles.matchBadgeOverlay}>
                        <StudioBadge
                          label={`${Math.round((photo.similarity || 0.9) * 100)}% Match`}
                          variant="gold"
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Event Selector Modal */}
      <Modal
        visible={eventSelectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEventSelectorVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Event Collection</Text>
              <TouchableOpacity onPress={() => setEventSelectorVisible(false)}>
                <StudioIcon name="close" size={20} color={StudioTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.eventOptionRow,
                    item.id === selectedEventId && styles.eventOptionRowActive,
                  ]}
                  onPress={() => {
                    setSelectedEventId(item.id);
                    setSelectedEventTitle(item.title);
                    setEventSelectorVisible(false);
                    setHasSearched(false);
                    setMatchedPhotos([]);
                  }}
                >
                  <View>
                    <Text style={styles.eventOptionTitle}>{item.title}</Text>
                    <Text style={styles.eventOptionSub}>
                      {item.total_photos > 0 ? `${item.total_photos} photos` : 'Gallery available'}
                    </Text>
                  </View>
                  {item.id === selectedEventId && (
                    <StudioIcon name="check" size={18} color={StudioTheme.colors.secondary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Lightbox Modal */}
      <Modal
        visible={!!lightboxPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxPhoto(null)}
      >
        <View style={styles.lightboxBackdrop}>
          <TouchableOpacity
            style={styles.lightboxCloseBtn}
            onPress={() => setLightboxPhoto(null)}
          >
            <StudioIcon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxPhoto && (
            <View style={styles.lightboxContent}>
              <Image
                source={{ uri: lightboxPhoto.url }}
                style={styles.lightboxImage}
                contentFit="contain"
              />
              <View style={styles.lightboxMeta}>
                <Text style={styles.lightboxTitle}>{lightboxPhoto.title || 'Curated Master Photo'}</Text>
                <StudioBadge
                  label={`${Math.round((lightboxPhoto.similarity || 0.9) * 100)}% Face Similarity Match`}
                  variant="gold"
                />
              </View>
            </View>
          )}
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
    paddingTop: 14,
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: 580,
  },
  scopeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: StudioTheme.radius.xl,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  scopeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  scopeInfo: {
    flex: 1,
  },
  scopeLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: StudioTheme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scopeTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
    marginTop: 1,
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: StudioTheme.radius.lg,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  switchBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
  },
  introBox: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  introEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  introHeading: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    textAlign: 'center',
  },
  introDesc: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
  viewfinderCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    padding: StudioTheme.spacing.lg,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    ...StudioTheme.shadows.level1,
  },
  glowBackdrop: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(252, 216, 156, 0.2)',
  },
  ovalGuideWrapper: {
    position: 'relative',
    marginVertical: 14,
  },
  ovalHalo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 80,
    backgroundColor: 'rgba(117, 90, 42, 0.15)',
  },
  ovalPortal: {
    width: 150,
    height: 195,
    borderRadius: 75,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.secondary,
    ...StudioTheme.shadows.level2,
  },
  portalImage: {
    width: '100%',
    height: '100%',
  },
  emptyViewfinder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  apertureIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    ...StudioTheme.shadows.level1,
  },
  viewfinderLabel: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  viewfinderSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  cornerDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(117, 90, 42, 0.5)',
  },
  dotTL: { top: 12, left: 16 },
  dotTR: { top: 12, right: 16 },
  dotBL: { bottom: 12, left: 16 },
  dotBR: { bottom: 12, right: 16 },
  guidanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  guidanceText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  captureButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginBottom: 14,
  },
  btnHalf: {
    flex: 1,
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 16,
    width: '100%',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
  },
  checkboxActive: {
    backgroundColor: StudioTheme.colors.primary,
    borderColor: StudioTheme.colors.primary,
  },
  consentDisclaimer: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    lineHeight: 15,
  },
  scanButtonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  scanMetaDisclaimer: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
    marginTop: 8,
    textAlign: 'center',
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 14,
    borderRadius: StudioTheme.radius.xl,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  shieldIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: StudioTheme.colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  privacyTitle: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  privacyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: StudioTheme.colors.secondary,
  },
  privacyDesc: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    lineHeight: 16,
  },
  resultsSection: {
    width: '100%',
    marginBottom: 24,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  resultsEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  resultsHeading: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    marginTop: 2,
  },
  searchErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.warningSurface,
    padding: 12,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 14,
  },
  searchErrorText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.warning,
    flex: 1,
    lineHeight: 17,
  },
  noMatchesBox: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  noMatchesTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    marginTop: 10,
  },
  noMatchesText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 340,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    aspectRatio: 4 / 5,
    borderRadius: StudioTheme.radius.lg,
    overflow: 'hidden',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  matchBadgeOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
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
    maxWidth: 420,
    maxHeight: '70%',
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    padding: 18,
    ...StudioTheme.shadows.level3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: StudioTheme.colors.hairline,
  },
  modalTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
  },
  eventOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: StudioTheme.colors.hairline,
  },
  eventOptionRowActive: {
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.md,
  },
  eventOptionTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  eventOptionSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxContent: {
    width: '100%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '85%',
  },
  lightboxMeta: {
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  lightboxTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

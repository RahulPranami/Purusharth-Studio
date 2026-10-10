import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';

const UNLOCKED_EVENTS_KEY = '@purusharth_unlocked_events';

interface EventPass {
  id: string;
  title: string;
  total_photos: number;
  event_date?: string;
  location?: string;
  cover_url?: string;
}

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  cover_url: string | null;
  total_photos: number;
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user, profile, isAuthenticated } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 10
    : Math.max(insets.top, 12);

  const [eventCode, setEventCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activePasses, setActivePasses] = useState<EventPass[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventRecord[]>([]);

  const [previewVideoOpen, setPreviewVideoOpen] = useState(false);
  const [activeVideoTitle, setActiveVideoTitle] = useState('');

  // Dismiss native splash screen on mount
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Load unlocked passes (AsyncStorage + Supabase) and live events
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Load saved passes from local storage
        const savedJson = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
        let passes: EventPass[] = savedJson ? JSON.parse(savedJson) : [];

        // 2. If logged in, fetch user's event memberships from Supabase
        if (user?.id) {
          const { data: memberRows, error: memberErr } = await supabase
            .from('event_members')
            .select('event_id, events(id, title, total_photos, event_date, location, cover_url)')
            .eq('user_id', user.id);

          if (!memberErr && memberRows && memberRows.length > 0) {
            memberRows.forEach((row: any) => {
              if (row.events && !passes.some((p) => p.id === row.events.id)) {
                passes.push({
                  id: row.events.id,
                  title: row.events.title,
                  total_photos: row.events.total_photos || 0,
                  event_date: row.events.event_date,
                  location: row.events.location,
                  cover_url: row.events.cover_url,
                });
              }
            });
          }
        }

        setActivePasses(passes);

        // 3. Load active productions from Supabase
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, title, description, event_date, location, cover_url, total_photos')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (eventsData && eventsData.length > 0) {
          setLiveEvents(eventsData);
        }
      } catch (e) {
        console.warn('Error loading initial data:', e);
      }
    }

    loadData();
  }, [user]);

  // Handle Event Code submission (Supports adding multiple codes without overwrite)
  const handleUnlockEvent = async () => {
    const code = eventCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter an event code (e.g. UDAIPUR-24)');
      return;
    }

    setUnlocking(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Call Supabase join_event_by_code RPC
      const { data, error } = await supabase.rpc('join_event_by_code', { p_code: code });

      if (error) {
        throw error;
      }

      if (data && data.success) {
        const targetId = data.event_id || data.event?.id || data.id;
        const newPass: EventPass = {
          id: targetId,
          title: data.title || data.event?.title || 'Private Event',
          total_photos: data.total_photos ?? data.event?.total_photos ?? 0,
          event_date: data.event_date || data.event?.event_date,
          location: data.location || data.event?.location,
          cover_url: data.cover_url || data.event?.cover_url,
        };

        // Merge with existing AsyncStorage items to prevent overwrite
        const currentSaved = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
        const existingStored: EventPass[] = currentSaved ? JSON.parse(currentSaved) : [];
        const mergedMap = new Map<string, EventPass>();
        [newPass, ...activePasses, ...existingStored].forEach((p) => {
          if (p && p.id && !mergedMap.has(p.id)) {
            mergedMap.set(p.id, p);
          }
        });
        const updatedPasses = Array.from(mergedMap.values());

        setActivePasses(updatedPasses);
        await AsyncStorage.setItem(UNLOCKED_EVENTS_KEY, JSON.stringify(updatedPasses));

        setSuccessMessage(`Access granted to ${newPass.title}!`);
        setEventCode('');

        // Navigate directly to the unlocked gallery
        setTimeout(() => {
          router.push(`/event/${targetId}` as any);
        }, 300);
        return;
      }

      setErrorMessage(data?.message || data?.error || 'Invalid or expired event code.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to access vault. Please verify your code.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Top Luxury Navigation Header */}
      <View style={[styles.navHeader, { paddingTop: topInset }]}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/studio-logo-transparent.png')}
            style={styles.brandLogo}
            contentFit="contain"
          />
        </View>

        <View style={styles.navActions}>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.profileBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/profile' as any)}>
              {profile?.selfie_url ? (
                <Image source={{ uri: profile.selfie_url }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/login' as any)}>
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>CLIENT & DIRECTOR PORTAL</Text>
          <Text style={styles.heroTitle}>Private Event Archives</Text>
          <Text style={styles.heroDesc}>
            Enter your private passcodes to access high-resolution photo galleries and cinema lookbooks.
          </Text>
        </View>

        {/* SECTION 1: Event Code Entry Vault */}
        <View style={styles.vaultCard}>
          <View style={styles.vaultHeaderRow}>
            <Text style={styles.vaultSubtitle}>ACCESS EVENT VAULT</Text>
            <View style={styles.privatePill}>
              <Text style={styles.privateLock}>🔒</Text>
              <Text style={styles.privateText}>Private Passcode</Text>
            </View>
          </View>

          <Text style={styles.vaultTitle}>Enter Event Code</Text>
          <Text style={styles.vaultHint}>
            Add any private event code (e.g. UDAIPUR-24, OBEROI-GL) to unlock and store your gallery access.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.tagIcon}>#</Text>
            <TextInput
              style={styles.inputField}
              value={eventCode}
              onChangeText={setEventCode}
              placeholder="e.g. UDAIPUR-24"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              maxLength={24}
              returnKeyType="go"
              onSubmitEditing={handleUnlockEvent}
            />
          </View>

          {errorMessage ? (
            <Text style={styles.errorBanner}>{errorMessage}</Text>
          ) : null}

          {successMessage ? (
            <Text style={styles.successBanner}>{successMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.unlockBtn}
            activeOpacity={0.85}
            onPress={handleUnlockEvent}
            disabled={unlocking}>
            {unlocking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.unlockBtnText}>VIEW EVENT PHOTOS</Text>
                <Text style={styles.unlockBtnArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.aiFeatureBox}>
            <Text style={styles.aiSparkleIcon}>✦</Text>
            <Text style={styles.aiFeatureText}>
              You can add multiple event codes to your device. Once unlocked, each event remains permanently accessible in your Active Passes below.
            </Text>
          </View>

          {/* Active Passes Section */}
          <View style={styles.activePassSection}>
            <View style={styles.passHeaderRow}>
              <Text style={styles.activePassHeader}>ACTIVE PASSES ({activePasses.length})</Text>
              {activePasses.length > 0 && (
                <Text style={styles.passCounter}>Tap any event to view photos</Text>
              )}
            </View>

            {activePasses.length === 0 ? (
              <View style={styles.emptyPassBox}>
                <Text style={styles.emptyPassIcon}>🎟️</Text>
                <Text style={styles.emptyPassText}>
                  No active passes yet. Enter your private invitation code above to unlock your gallery.
                </Text>
              </View>
            ) : (
              activePasses.map((pass) => (
                <TouchableOpacity
                  key={pass.id}
                  style={styles.passRow}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/event/${pass.id}` as any)}>
                  <View style={styles.passDot} />
                  <View style={styles.passInfo}>
                    <Text style={styles.passTitle}>{pass.title}</Text>
                    <Text style={styles.passDetails}>
                      {pass.total_photos > 0 ? `${pass.total_photos} Photos` : 'Gallery Ready'} •{' '}
                      {pass.location || 'Private Venue'}
                    </Text>
                  </View>
                  <Text style={styles.passChevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* SECTION 2: Studio Productions from Database */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.eyebrow}>STUDIO ARCHIVES</Text>
            <Text style={styles.sectionHeading}>Current Productions</Text>
          </View>
          <View style={styles.releaseBadge}>
            <Text style={styles.releaseBadgeText}>OFFICIAL</Text>
          </View>
        </View>

        <View style={styles.collectionsGrid}>
          {liveEvents.map((item) => (
            <View key={item.id} style={styles.collectionCard}>
              <View style={styles.imageBox}>
                {item.cover_url ? (
                  <Image source={{ uri: item.cover_url }} style={styles.collectionImg} />
                ) : (
                  <View style={styles.placeholderCover}>
                    <Text style={styles.placeholderCoverText}>{item.title}</Text>
                  </View>
                )}
                <View style={styles.gradientOverlay} />
                <View style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>Production Gallery</Text>
                </View>
                <View style={styles.cardHeaderOverlay}>
                  <Text style={styles.cardSubText}>{item.location || 'Exclusive Archive'}</Text>
                  <Text style={styles.cardTitleText}>{item.title}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.metricsRow}>
                  <Text style={styles.metricItem}>
                    📷 {item.total_photos} Photos Ingested
                  </Text>
                  {item.event_date && (
                    <Text style={styles.metricItem}>
                      📅 {item.event_date}
                    </Text>
                  )}
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.openStillsBtn}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/event/${item.id}` as any)}>
                    <Text style={styles.openStillsText}>OPEN GALLERY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.watchPreviewBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      setActiveVideoTitle(item.title);
                      setPreviewVideoOpen(true);
                    }}>
                    <Text style={styles.watchPreviewText}>▶ PREVIEW TEASER</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Cinematic Film Preview Modal */}
      <Modal
        visible={previewVideoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVideoOpen(false)}>
        <View style={styles.videoModalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setPreviewVideoOpen(false)}
          />
          <View style={styles.videoModalContent}>
            <View style={styles.videoModalHeader}>
              <View>
                <Text style={styles.videoPill}>4K MASTER PREVIEW</Text>
                <Text style={styles.videoTitle}>{activeVideoTitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setPreviewVideoOpen(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.videoPlayerPlaceholder}>
              <View style={styles.playCenter}>
                <Text style={styles.playBigIcon}>▶</Text>
                <Text style={styles.playBigLabel}>ProRes 4444 • 03:45 Director Cut</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF9F4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  desktopContainer: {
    maxWidth: 1040,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE8E0',
    backgroundColor: '#FBF9F4',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 140,
    height: 38,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  signInBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#1B1C19',
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#755A2A',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#755A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  heroSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#755A2A',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1B1C19',
    marginTop: 4,
    letterSpacing: -0.5,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  heroDesc: {
    fontSize: 14,
    color: '#555555',
    marginTop: 6,
    lineHeight: 22,
  },
  vaultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    borderColor: '#F0ECE1',
    marginBottom: 32,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#755A2A',
    letterSpacing: 1.2,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FDF7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privateLock: {
    fontSize: 10,
  },
  privateText: {
    fontSize: 11,
    color: '#755A2A',
    fontWeight: '600',
  },
  vaultTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1B1C19',
    marginTop: 10,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  vaultHint: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F6F2',
    borderRadius: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E7E3D8',
  },
  tagIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#755A2A',
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1C19',
    letterSpacing: 1.5,
  },
  errorBanner: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 10,
    fontWeight: '500',
  },
  successBanner: {
    fontSize: 12,
    color: '#16A34A',
    marginBottom: 10,
    fontWeight: '600',
  },
  unlockBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1B1C19',
    height: 48,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  unlockBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  unlockBtnArrow: {
    color: '#FCD89C',
    fontSize: 18,
  },
  aiFeatureBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F0',
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EFE8DA',
  },
  aiSparkleIcon: {
    fontSize: 14,
    color: '#755A2A',
  },
  aiFeatureText: {
    flex: 1,
    fontSize: 12,
    color: '#555555',
    lineHeight: 18,
  },
  activePassSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0ECE1',
    paddingTop: 16,
  },
  passHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activePassHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#755A2A',
    letterSpacing: 1,
  },
  passCounter: {
    fontSize: 11,
    color: '#888888',
  },
  emptyPassBox: {
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 12,
    backgroundColor: '#FAF8F4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE0',
    borderStyle: 'dashed',
  },
  emptyPassIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyPassText: {
    fontSize: 12,
    color: '#777777',
    textAlign: 'center',
    lineHeight: 18,
  },
  passRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  passDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#755A2A',
    marginRight: 12,
  },
  passInfo: {
    flex: 1,
  },
  passTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B1C19',
  },
  passDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  passChevron: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1B1C19',
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  releaseBadge: {
    backgroundColor: '#EDE8DE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  releaseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#555555',
    letterSpacing: 0.8,
  },
  collectionsGrid: {
    gap: 20,
  },
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECE8DF',
  },
  imageBox: {
    position: 'relative',
    height: 220,
    backgroundColor: '#1E1E1E',
  },
  collectionImg: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27272A',
  },
  placeholderCoverText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tagBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1B1C19',
    letterSpacing: 0.6,
  },
  cardHeaderOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  cardSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FCD89C',
    letterSpacing: 1.1,
  },
  cardTitleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Georgia', default: 'serif' }),
  },
  cardFooter: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  metricItem: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  openStillsBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F3F0E8',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openStillsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B1C19',
    letterSpacing: 1,
  },
  watchPreviewBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#755A2A',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchPreviewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  videoModalContent: {
    width: '100%',
    maxWidth: 680,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  videoPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FCD89C',
    letterSpacing: 1.2,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  videoPlayerPlaceholder: {
    height: 320,
    position: 'relative',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCenter: {
    alignItems: 'center',
  },
  playBigIcon: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  playBigLabel: {
    marginTop: 10,
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
});

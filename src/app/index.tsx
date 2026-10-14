import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioHeader } from '@/components/ui/StudioHeader';
import { StudioBottomNav } from '@/components/ui/StudioBottomNav';
import { StudioButton } from '@/components/ui/StudioButton';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioBadge } from '@/components/ui/StudioBadge';

const UNLOCKED_EVENTS_KEY = '@purusharth_unlocked_events';

interface EventPass {
  id: string;
  title: string;
  total_photos: number;
  event_date?: string;
  location?: string;
  cover_url?: string;
}

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user, profile, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const [eventCode, setEventCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activePasses, setActivePasses] = useState<EventPass[]>([]);

  // Cinema modal
  const [previewVideoOpen, setPreviewVideoOpen] = useState(false);
  const [activeVideoTitle, setActiveVideoTitle] = useState('Royal Udaipur Wedding • 4K Highlights');

  // Dismiss native splash screen on mount
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Web check: if super_admin or admin on desktop web, route to /admin
  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      isAuthenticated &&
      (profile?.role === 'super_admin' || profile?.role === 'admin')
    ) {
      router.replace('/admin' as any);
    }
  }, [isAuthenticated, profile?.role, router]);

  // Load unlocked passes (AsyncStorage + Supabase)
  useEffect(() => {
    async function loadData() {
      try {
        const savedJson = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
        let passes: EventPass[] = savedJson ? JSON.parse(savedJson) : [];

        // Fetch from Supabase event_members if logged in
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

        // If user has no passes yet, load seed events so they can explore
        if (passes.length === 0) {
          const { data: seedEvents } = await supabase
            .from('events')
            .select('id, title, total_photos, event_date, location, cover_url')
            .limit(2);

          if (seedEvents && seedEvents.length > 0) {
            passes = seedEvents.map((ev: any) => ({
              id: ev.id,
              title: ev.title,
              total_photos: ev.total_photos || 840,
              event_date: ev.event_date || 'Dec 18, 2024',
              location: ev.location || 'Jagmandir Island, Udaipur',
              cover_url: ev.cover_url,
            }));
          }
        }

        setActivePasses(passes);
      } catch (e) {
        console.warn('Error loading passes:', e);
      }
    }

    loadData();
  }, [user]);

  // Handle Event Code submission
  const handleUnlockEvent = async () => {
    const code = eventCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage('Please enter an event code (e.g. UDAIPUR-24, OBEROI-GL)');
      return;
    }

    setUnlocking(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
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

        setSuccessMessage(`Access granted to "${newPass.title}"!`);
        setEventCode('');

        setTimeout(() => {
          router.push(`/event/${targetId}` as any);
        }, 500);
      } else {
        setErrorMessage(data?.error || 'Invalid or expired event code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed. Please check network connectivity.');
    } finally {
      setUnlocking(false);
    }
  };

  const primeEvent = activePasses[0] || {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'The Royal Udaipur Wedding',
    event_date: 'Dec 18, 2024',
    location: 'Aarav & Meera • Jagmandir Island',
    total_photos: 840,
    cover_url:
      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
  };

  const secondaryEvent = activePasses[1] || {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Sangeet & Cocktail Soirée',
    event_date: 'Dec 16, 2024',
    location: 'The Grand Verandah & Poolside',
    total_photos: 580,
    cover_url:
      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_002.jpg',
  };

  const totalPhotoCount = activePasses.reduce((acc, p) => acc + (p.total_photos || 0), 0);
  const clientFirstName = profile?.display_name
    ? profile.display_name.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : 'Guest';

  return (
    <View style={styles.screenWrapper}>
      <StudioHeader />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 84 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* SECTION 1: EDITORIAL WELCOME HERO */}
          <View style={styles.welcomeHero}>
            <View style={styles.vaultPill}>
              <StudioIcon name="verified" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.vaultPillText}>Private Client Vault</Text>
            </View>

            <View style={styles.welcomeHeadlineRow}>
              <Text style={styles.welcomeHeadline}>Welcome, {clientFirstName}</Text>
              <Text style={styles.volumeText}>Vol. III</Text>
            </View>

            <Text style={styles.welcomeSub}>
              Your private collection of lifetime memories, curated by our principal cinematographers.
            </Text>

            {/* Stats Pill Strip */}
            <View style={styles.statsStrip}>
              <View style={styles.statsPill}>
                <View style={styles.statsDot} />
                <Text style={styles.statsPillText}>
                  {activePasses.length} {activePasses.length === 1 ? 'Event' : 'Events'} Available
                </Text>
              </View>

              <View style={styles.statsPill}>
                <StudioIcon name="photo_library" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                <Text style={styles.statsPillText}>
                  {totalPhotoCount > 0 ? totalPhotoCount.toLocaleString() : '1,420'} High-Res Photos
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: PRIME FEATURE EVENT CARD */}
          <View style={styles.primeCardSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Prime Feature</Text>
              <Text style={styles.sectionDate}>{primeEvent.event_date || 'Winter 2024'}</Text>
            </View>

            <View style={styles.primeCard}>
              <TouchableOpacity
                style={styles.primeCoverWrapper}
                activeOpacity={0.9}
                onPress={() => router.push(`/event/${primeEvent.id}` as any)}
              >
                <Image
                  source={{
                    uri:
                      primeEvent.cover_url ||
                      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
                  }}
                  style={styles.primeCoverImg}
                  contentFit="cover"
                />
                <View style={styles.primeScrim} />

                {/* Overlaid Badges */}
                <View style={styles.primeBadgesRow}>
                  <StudioBadge label="Full Access" variant="gold" showDot />
                  <StudioBadge label="Master Tier" variant="gold" iconName="download_done" />
                </View>

                {/* Overlaid Title on Image */}
                <View style={styles.primeOverlaidContent}>
                  <Text style={styles.primeTagline}>Ceremony &amp; Reception</Text>
                  <Text style={styles.primeTitle}>{primeEvent.title}</Text>
                  <Text style={styles.primeSub}>
                    {primeEvent.location || 'Aarav & Meera • Jagmandir Island'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card Meta & Actions */}
              <View style={styles.primeCardBody}>
                <View style={styles.primeMetaRow}>
                  <View style={styles.primeMetaLeft}>
                    <View style={styles.metaItem}>
                      <StudioIcon name="burst_mode" size={15} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>
                        {primeEvent.total_photos > 0 ? `${primeEvent.total_photos} Originals` : '840 Originals'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <StudioIcon name="videocam" size={15} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                      <Text style={styles.metaText}>12 Master 4K</Text>
                    </View>
                  </View>
                  <View style={styles.lockRow}>
                    <StudioIcon name="lock_open" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 3 }} />
                    <Text style={styles.lockText}>Originals Enabled</Text>
                  </View>
                </View>

                <View style={styles.primeActionsGrid}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <StudioButton
                      label="Open Gallery"
                      variant="primary"
                      iconTrailingName="arrow_forward"
                      onPress={() => router.push(`/event/${primeEvent.id}` as any)}
                      size="md"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <StudioButton
                      label="Find My Photos"
                      variant="gold"
                      iconName="face_retouching_natural"
                      onPress={() => router.push(`/find-photos?eventId=${primeEvent.id}` as any)}
                      size="md"
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 3: AI FACE SEARCH PROMO BANNER */}
          <TouchableOpacity
            style={styles.aiBanner}
            activeOpacity={0.85}
            onPress={() => router.push('/find-photos' as any)}
          >
            <View style={styles.aiBannerLeft}>
              <View style={styles.aiIconBubble}>
                <StudioIcon name="psychology" size={24} color={StudioTheme.colors.secondary} />
              </View>
              <View style={styles.aiTextContainer}>
                <View style={styles.aiPillRow}>
                  <Text style={styles.aiPillText}>Instant Facial Ingestion</Text>
                  <View style={styles.aiPulseDot} />
                </View>
                <Text style={styles.aiBannerTitle}>AI Face Match Available</Text>
                <Text style={styles.aiBannerDesc}>
                  Snap or upload a selfie to instantly index every portrait and candid you appear in across all events.
                </Text>
              </View>
            </View>
            <View style={styles.aiBannerAction}>
              <StudioButton
                label="Try Face Match"
                variant="gold"
                iconTrailingName="center_focus_strong"
                onPress={() => router.push('/find-photos' as any)}
                size="sm"
              />
            </View>
          </TouchableOpacity>

          {/* SECTION 4: ACCESS EVENT VAULT (PASSCODE ENTRY) */}
          <View style={styles.vaultCard}>
            <View style={styles.vaultHeaderRow}>
              <View>
                <Text style={styles.vaultEyebrow}>ACCESS EVENT VAULT</Text>
                <Text style={styles.vaultHeading}>Enter Event Code</Text>
              </View>
              <View style={styles.tokenBadge}>
                <StudioIcon name="lock_open" size={13} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                <Text style={styles.tokenBadgeText}>Private Token</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <StudioIcon name="tag" size={18} color={StudioTheme.colors.outline} style={styles.inputTagIcon} />
              <TextInput
                style={styles.codeTextInput}
                value={eventCode}
                onChangeText={setEventCode}
                placeholder="e.g. UDAIPUR-24, OBEROI-GL"
                placeholderTextColor={StudioTheme.colors.outline}
                autoCapitalize="characters"
                maxLength={20}
              />
            </View>

            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successAlert}>
                <Text style={styles.successAlertText}>{successMessage}</Text>
              </View>
            ) : null}

            <StudioButton
              label={unlocking ? 'Validating Token...' : 'View Event Photos'}
              iconTrailingName="arrow_forward"
              onPress={handleUnlockEvent}
              loading={unlocking}
              size="md"
            />

            <View style={styles.vaultFeatureNote}>
              <StudioIcon name="face_retouching_natural" size={18} color={StudioTheme.colors.secondary} style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={styles.vaultFeatureText}>
                Access your complete photo collection. Integrated <Text style={styles.vaultFeatureBold}>AI selfie filtering</Text> automatically matches and isolates your personal portraits across all sets.
              </Text>
            </View>

            {/* Active Passes Chip List */}
            {activePasses.length > 0 && (
              <View style={styles.passesSection}>
                <Text style={styles.passesHeader}>ACTIVE PASSES</Text>
                {activePasses.map((pass) => (
                  <TouchableOpacity
                    key={pass.id}
                    style={styles.passItemRow}
                    activeOpacity={0.8}
                    onPress={() => router.push(`/event/${pass.id}` as any)}
                  >
                    <View style={styles.passItemLeft}>
                      <View style={styles.passGreenDot} />
                      <View style={styles.passItemTextWrap}>
                        <Text style={styles.passItemTitle} numberOfLines={1}>
                          {pass.title}
                        </Text>
                        <Text style={styles.passItemSub}>
                          {pass.total_photos > 0 ? `${pass.total_photos} Photos` : 'Master Vault'} • Full Access Granted
                        </Text>
                      </View>
                    </View>
                    <StudioIcon name="chevron_right" size={20} color={StudioTheme.colors.outline} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* SECTION 5: CURATED PORTFOLIOS & SHARED COLLECTIONS */}
          <View style={styles.collectionsSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionEyebrow}>Curated Portfolios</Text>
                <Text style={styles.sectionTitleLarge}>Shared Collections</Text>
              </View>
              <StudioBadge label="Master Release" variant="gold" />
            </View>

            {/* Collection Card 1 */}
            <View style={styles.collectionCard}>
              <View style={styles.collectionCoverWrapper}>
                <Image
                  source={{
                    uri:
                      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
                  }}
                  style={styles.collectionCoverImg}
                  contentFit="cover"
                />
                <View style={styles.collectionScrim} />
                <View style={styles.collectionBadge}>
                  <Text style={styles.collectionBadgeText}>Featured Gallery</Text>
                </View>
                <View style={styles.collectionOverlayMeta}>
                  <Text style={styles.collectionEyebrow}>Master Curation</Text>
                  <Text style={styles.collectionTitle}>The Royal Udaipur Highlights</Text>
                </View>
              </View>

              <View style={styles.collectionBody}>
                <View style={styles.collectionMetaRow}>
                  <View style={styles.metaItem}>
                    <StudioIcon name="photo_library" size={16} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>840 High-Res Photos</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <StudioIcon name="movie" size={16} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>12 Cinematic Reels</Text>
                  </View>
                </View>

                <View style={styles.collectionActions}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <StudioButton
                      label="Open Stills"
                      iconName="photo_library"
                      variant="outline"
                      onPress={() => router.push(`/event/${primeEvent.id}` as any)}
                      size="sm"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <StudioButton
                      label="Watch Preview"
                      iconName="play_circle"
                      variant="gold"
                      onPress={() => {
                        setActiveVideoTitle('The Royal Udaipur Highlights');
                        setPreviewVideoOpen(true);
                      }}
                      size="sm"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 4K Cinema Reel Card */}
            <View style={styles.collectionCard}>
              <TouchableOpacity
                style={styles.collectionCoverWrapper}
                activeOpacity={0.9}
                onPress={() => {
                  setActiveVideoTitle('Palace Twilight Cinema Still Lookbook');
                  setPreviewVideoOpen(true);
                }}
              >
                <Image
                  source={{
                    uri:
                      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_002.jpg',
                  }}
                  style={styles.collectionCoverImg}
                  contentFit="cover"
                />
                <View style={styles.collectionScrim} />

                {/* Big Center Play Button */}
                <View style={styles.playCenterCircle}>
                  <StudioIcon name="play_arrow" size={32} color={StudioTheme.colors.primary} />
                </View>

                <View style={styles.videoDurationPill}>
                  <Text style={styles.videoDurationText}>4K • 02:45</Text>
                </View>

                <View style={styles.collectionOverlayMeta}>
                  <Text style={styles.collectionEyebrow}>ProRes 4444 Teaser</Text>
                  <Text style={styles.collectionTitle}>Palace Twilight Cinema Reel</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 6: SECONDARY EVENT CARD */}
          <View style={styles.secondarySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionEyebrow}>Previous Celebration</Text>
              <Text style={styles.sectionDate}>{secondaryEvent.event_date || 'Dec 16, 2024'}</Text>
            </View>

            <View style={styles.secondaryCard}>
              <View style={styles.secondaryRow}>
                <Image
                  source={{
                    uri:
                      secondaryEvent.cover_url ||
                      'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_002.jpg',
                  }}
                  style={styles.secondaryThumb}
                  contentFit="cover"
                />
                <View style={styles.secondaryInfo}>
                  <View style={styles.nightlifeRow}>
                    <StudioIcon name="nightlife" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                    <Text style={styles.nightlifeText}>Music &amp; Cocktails</Text>
                  </View>
                  <Text style={styles.secondaryTitle} numberOfLines={1}>
                    {secondaryEvent.title}
                  </Text>
                  <Text style={styles.secondarySub} numberOfLines={1}>
                    {secondaryEvent.location || 'The Grand Verandah & Poolside'}
                  </Text>
                  <Text style={styles.secondaryStats}>
                    {secondaryEvent.total_photos > 0 ? `${secondaryEvent.total_photos} High-Res Photos` : '580 Photos'} • Ready
                  </Text>
                </View>
              </View>

              <View style={styles.secondaryBottomBar}>
                <View style={styles.zipReadyRow}>
                  <StudioIcon name="cloud_download" size={14} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                  <Text style={styles.zipReadyText}>Zip Archives Ready</Text>
                </View>
                <StudioButton
                  label="Open Gallery"
                  iconTrailingName="chevron_right"
                  variant="outline"
                  onPress={() => router.push(`/event/${secondaryEvent.id}` as any)}
                  size="sm"
                  fullWidth={false}
                />
              </View>
            </View>
          </View>

          {/* SECTION 7: STUDIO ASSURANCE FOOTER */}
          <View style={styles.assuranceFooter}>
            <View style={styles.monogramBubble}>
              <Image
                source={require('@/../assets/images/purusharth-studio-logo.jpg')}
                style={styles.monogramImg}
                contentFit="contain"
              />
            </View>
            <View style={styles.assuranceTitleRow}>
              <StudioIcon name="shield" size={15} color={StudioTheme.colors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.assuranceTitle}>Studio Assurance</Text>
            </View>
            <Text style={styles.assuranceDesc}>
              Private &amp; Secure • Watermarked Previews &amp; Cloud Originals
            </Text>
            <Text style={styles.assuranceSub}>
              Encrypted Cloud Storage • Exclusively for {clientFirstName}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Cinematic Video Preview Modal */}
      <Modal
        visible={previewVideoOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVideoOpen(false)}
      >
        <View style={styles.videoModalBackdrop}>
          <TouchableOpacity
            style={styles.videoModalClose}
            onPress={() => setPreviewVideoOpen(false)}
          >
            <StudioIcon name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.videoModalContent}>
            <View style={styles.videoPlayerBox}>
              <Image
                source={{
                  uri:
                    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
                }}
                style={styles.videoPlayerPoster}
                contentFit="cover"
              />
              <View style={styles.videoPlayerScrim}>
                <View style={styles.playBigCircle}>
                  <StudioIcon name="play_arrow" size={42} color={StudioTheme.colors.primary} />
                </View>
              </View>
            </View>

            <View style={styles.videoModalMeta}>
              <Text style={styles.videoModalTitle}>{activeVideoTitle}</Text>
              <Text style={styles.videoModalDesc}>
                Shot on ARRI ALEXA Mini LF • Anamorphic Master Lookbook
              </Text>
              <StudioBadge label="ProRes 4444 Master" variant="gold" />
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
    maxWidth: 620,
  },
  welcomeHero: {
    marginBottom: 20,
    paddingTop: 4,
  },
  vaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  vaultPillText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  welcomeHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  welcomeHeadline: {
    fontFamily: Fonts.serif,
    fontSize: 28,
    fontWeight: '400',
    color: StudioTheme.colors.onSurface,
    letterSpacing: -0.3,
  },
  volumeText: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontStyle: 'italic',
    color: StudioTheme.colors.secondary,
    opacity: 0.8,
  },
  welcomeSub: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: StudioTheme.colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 20,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: StudioTheme.radius.full,
  },
  statsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: StudioTheme.colors.secondary,
    marginRight: 6,
  },
  statsPillText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  primeCardSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  sectionDate: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.secondary,
    fontWeight: '600',
  },
  primeCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    ...StudioTheme.shadows.level1,
  },
  primeCoverWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  primeCoverImg: {
    width: '100%',
    height: '100%',
  },
  primeScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 28, 25, 0.45)',
  },
  primeBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primeOverlaidContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  primeTagline: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  primeTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  primeSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  primeCardBody: {
    padding: 14,
  },
  primeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  primeMetaLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  primeActionsGrid: {
    flexDirection: 'row',
  },
  aiBanner: {
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xxl,
    padding: 14,
    flexDirection: 'column',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  aiIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: StudioTheme.colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  aiPillText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  aiPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: StudioTheme.colors.secondary,
  },
  aiBannerTitle: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  aiBannerDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 4,
  },
  aiBannerAction: {
    alignSelf: 'flex-end',
  },
  vaultCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    padding: StudioTheme.spacing.lg,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginBottom: 20,
    ...StudioTheme.shadows.level1,
  },
  vaultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  vaultEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  vaultHeading: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    marginTop: 2,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  tokenBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xl,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginBottom: 12,
  },
  inputTagIcon: {
    marginRight: 8,
  },
  codeTextInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    paddingVertical: 12,
    letterSpacing: 1.5,
  },
  errorAlert: {
    backgroundColor: StudioTheme.colors.errorContainer,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 10,
  },
  errorAlertText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onErrorContainer,
  },
  successAlert: {
    backgroundColor: StudioTheme.colors.successSurface,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 10,
  },
  successAlertText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.success,
  },
  vaultFeatureNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginTop: 12,
  },
  vaultFeatureText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 16,
  },
  vaultFeatureBold: {
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
  },
  passesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: StudioTheme.colors.hairline,
  },
  passesHeader: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  passItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    padding: 10,
    borderRadius: StudioTheme.radius.lg,
    marginBottom: 6,
  },
  passItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  passGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: StudioTheme.colors.secondary,
    marginRight: 8,
  },
  passItemTextWrap: {
    flex: 1,
  },
  passItemTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  passItemSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  collectionsSection: {
    marginBottom: 20,
  },
  sectionTitleLarge: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
  },
  collectionCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginTop: 12,
    ...StudioTheme.shadows.level1,
  },
  collectionCoverWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  collectionCoverImg: {
    width: '100%',
    height: '100%',
  },
  collectionScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 28, 25, 0.4)',
  },
  collectionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: StudioTheme.radius.full,
  },
  collectionBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  collectionOverlayMeta: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  collectionEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  collectionTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  collectionBody: {
    padding: 12,
  },
  collectionMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  collectionActions: {
    flexDirection: 'row',
  },
  playCenterCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -24 }, { translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...StudioTheme.shadows.level2,
  },
  videoDurationPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondarySection: {
    marginBottom: 20,
  },
  secondaryCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    padding: 12,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    ...StudioTheme.shadows.level1,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  secondaryThumb: {
    width: 80,
    height: 80,
    borderRadius: StudioTheme.radius.xl,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  secondaryInfo: {
    flex: 1,
  },
  nightlifeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  nightlifeText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  secondaryTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '600',
    color: StudioTheme.colors.onSurface,
  },
  secondarySub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
    marginTop: 1,
  },
  secondaryStats: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
    marginTop: 4,
  },
  secondaryBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: StudioTheme.colors.hairline,
  },
  zipReadyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zipReadyText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  assuranceFooter: {
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.xxl,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginBottom: 10,
  },
  monogramBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  monogramImg: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  assuranceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assuranceTitle: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  assuranceDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  assuranceSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: StudioTheme.colors.outline,
    textAlign: 'center',
    marginTop: 4,
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  videoModalClose: {
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
  videoModalContent: {
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  videoPlayerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: StudioTheme.radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoPlayerPoster: {
    width: '100%',
    height: '100%',
  },
  videoPlayerScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBigCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalMeta: {
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  videoModalTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  videoModalDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});

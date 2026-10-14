import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioHeader } from '@/components/ui/StudioHeader';
import { StudioBottomNav } from '@/components/ui/StudioBottomNav';
import { StudioButton } from '@/components/ui/StudioButton';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioBadge } from '@/components/ui/StudioBadge';

const UNLOCKED_EVENTS_KEY = '@purusharth_unlocked_events';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  event_date?: string;
  location?: string;
  cover_url?: string;
  total_photos: number;
  status?: string;
  is_pass?: boolean;
}

export default function EventsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'passes' | 'public'>('all');

  // Code entry modal
  const [passcodeModalVisible, setPasscodeModalVisible] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const eventMap = new Map<string, EventItem>();

      // 1. Fetch from local storage (passes unlocked on this device)
      const savedJson = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
      if (savedJson) {
        const stored: EventItem[] = JSON.parse(savedJson);
        stored.forEach((item) => {
          if (item && item.id) {
            eventMap.set(item.id, { ...item, is_pass: true });
          }
        });
      }

      // 2. If logged in, fetch user's event memberships from Supabase
      if (user?.id) {
        const { data: memberRows } = await supabase
          .from('event_members')
          .select('event_id, events(id, title, description, total_photos, event_date, location, cover_url)')
          .eq('user_id', user.id);

        if (memberRows && memberRows.length > 0) {
          memberRows.forEach((row: any) => {
            if (row.events && row.events.id) {
              eventMap.set(row.events.id, {
                id: row.events.id,
                title: row.events.title,
                description: row.events.description,
                total_photos: row.events.total_photos || 0,
                event_date: row.events.event_date,
                location: row.events.location,
                cover_url: row.events.cover_url,
                is_pass: true,
              });
            }
          });
        }
      }

      // 3. Fetch public studio collections & published events
      const { data: publicEvents } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active');

      if (publicEvents) {
        publicEvents.forEach((ev: any) => {
          if (!eventMap.has(ev.id)) {
            eventMap.set(ev.id, {
              id: ev.id,
              title: ev.title,
              description: ev.description,
              total_photos: ev.total_photos || 0,
              event_date: ev.event_date,
              location: ev.location,
              cover_url: ev.cover_url,
              is_pass: false,
            });
          }
        });
      }

      setEvents(Array.from(eventMap.values()));
    } catch (e) {
      console.warn('Error loading events:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleUnlockCode = async () => {
    const code = passcodeInput.trim().toUpperCase();
    if (!code) {
      setModalFeedback({ type: 'error', message: 'Please enter a valid event passcode.' });
      return;
    }

    setUnlocking(true);
    setModalFeedback(null);

    try {
      const { data, error } = await supabase.rpc('join_event_by_code', { p_code: code });
      if (error) throw error;

      if (data && data.success) {
        const targetId = data.event_id || data.event?.id || data.id;
        const newPass: EventItem = {
          id: targetId,
          title: data.title || data.event?.title || 'Private Event',
          total_photos: data.total_photos ?? data.event?.total_photos ?? 0,
          event_date: data.event_date || data.event?.event_date,
          location: data.location || data.event?.location,
          cover_url: data.cover_url || data.event?.cover_url,
          is_pass: true,
        };

        const currentSaved = await AsyncStorage.getItem(UNLOCKED_EVENTS_KEY);
        const existing: EventItem[] = currentSaved ? JSON.parse(currentSaved) : [];
        const merged = [newPass, ...existing.filter((e) => e.id !== newPass.id)];
        await AsyncStorage.setItem(UNLOCKED_EVENTS_KEY, JSON.stringify(merged));

        setModalFeedback({
          type: 'success',
          message: `Access granted to "${newPass.title}"!`,
        });

        setTimeout(() => {
          setPasscodeModalVisible(false);
          setPasscodeInput('');
          setModalFeedback(null);
          loadEvents();
          router.push(`/event/${targetId}` as any);
        }, 800);
      } else {
        setModalFeedback({
          type: 'error',
          message: data?.error || 'Invalid or expired event code.',
        });
      }
    } catch (err: any) {
      setModalFeedback({
        type: 'error',
        message: err.message || 'Passcode verification failed.',
      });
    } finally {
      setUnlocking(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedFilter === 'passes' && !ev.is_pass) return false;
    if (selectedFilter === 'public' && ev.is_pass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ev.title.toLowerCase().includes(q);
      const matchLoc = ev.location?.toLowerCase().includes(q);
      return matchTitle || matchLoc;
    }
    return true;
  });

  return (
    <View style={styles.screenWrapper}>
      <StudioHeader
        title="Client Galleries"
        subtitle="Private Vaults & Lookbooks"
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.addCodeBtn}
            onPress={() => setPasscodeModalVisible(true)}
            activeOpacity={0.8}
          >
            <StudioIcon name="key" size={14} color={StudioTheme.colors.secondary} />
            <Text style={styles.addCodeBtnText}>Passcode</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <StudioIcon name="search" size={18} color={StudioTheme.colors.outline} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by event title or location..."
              placeholderTextColor={StudioTheme.colors.outline}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <StudioIcon name="close" size={16} color={StudioTheme.colors.outline} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'all' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={[styles.filterPillText, selectedFilter === 'all' && styles.filterPillTextActive]}>
                All Galleries ({events.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'passes' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('passes')}
            >
              <Text style={[styles.filterPillText, selectedFilter === 'passes' && styles.filterPillTextActive]}>
                Unlocked Passes ({events.filter((e) => e.is_pass).length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, selectedFilter === 'public' && styles.filterPillActive]}
              onPress={() => setSelectedFilter('public')}
            >
              <Text style={[styles.filterPillText, selectedFilter === 'public' && styles.filterPillTextActive]}>
                Public Lookbooks
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={StudioTheme.colors.secondary} />
              <Text style={styles.loadingText}>Loading studio galleries...</Text>
            </View>
          ) : filteredEvents.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <StudioIcon name="auto_awesome_motion" size={32} color={StudioTheme.colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Galleries Found</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'No collections match your search term. Try a different query.'
                  : 'You have not unlocked any private event vaults yet.'}
              </Text>
              <View style={{ marginTop: 14 }}>
                <StudioButton
                  label="Enter Event Passcode"
                  iconName="key"
                  variant="gold"
                  onPress={() => setPasscodeModalVisible(true)}
                  size="sm"
                />
              </View>
            </View>
          ) : (
            /* Event Cards List */
            <View style={styles.cardsList}>
              {filteredEvents.map((item) => (
                <View key={item.id} style={styles.eventCard}>
                  {/* Media Cover */}
                  <TouchableOpacity
                    style={styles.cardCoverWrapper}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/event/${item.id}` as any)}
                  >
                    <Image
                      source={{
                        uri:
                          item.cover_url ||
                          'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
                      }}
                      style={styles.cardCoverImg}
                      contentFit="cover"
                    />
                    <View style={styles.cardCoverScrim} />

                    {/* Top Badges */}
                    <View style={styles.cardBadgesRow}>
                      <StudioBadge
                        label={item.is_pass ? 'Full Access' : 'Editorial'}
                        variant={item.is_pass ? 'gold' : 'neutral'}
                        showDot
                      />
                      <StudioBadge label="Master Tier" variant="gold" iconName="download_done" />
                    </View>

                    {/* Overlaid Title on Cover */}
                    <View style={styles.cardCoverOverlayContent}>
                      <Text style={styles.cardCoverEyebrow}>
                        {item.location || 'Private Venue'}
                      </Text>
                      <Text style={styles.cardCoverTitle}>{item.title}</Text>
                      <Text style={styles.cardCoverSub}>
                        {item.event_date || 'Winter 2024'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Metadata and Actions */}
                  <View style={styles.cardBottomBar}>
                    <View style={styles.cardMetaLeft}>
                      <View style={styles.metaItem}>
                        <StudioIcon name="burst_mode" size={15} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>
                          {item.total_photos > 0 ? `${item.total_photos} Originals` : 'High-Res Vault'}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <StudioIcon name="videocam" size={15} color={StudioTheme.colors.secondary} style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>4K Reels</Text>
                      </View>
                    </View>

                    <View style={styles.cardActionsRow}>
                      <View style={{ flex: 1, marginRight: 6 }}>
                        <StudioButton
                          label="Open Gallery"
                          variant="primary"
                          iconTrailingName="arrow_forward"
                          onPress={() => router.push(`/event/${item.id}` as any)}
                          size="sm"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <StudioButton
                          label="Find Mine"
                          variant="gold"
                          iconName="face"
                          onPress={() => router.push(`/find-photos?eventId=${item.id}` as any)}
                          size="sm"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Passcode Modal */}
      <Modal
        visible={passcodeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasscodeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Access Event Vault</Text>
              <TouchableOpacity onPress={() => setPasscodeModalVisible(false)}>
                <StudioIcon name="close" size={20} color={StudioTheme.colors.onSurface} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Enter your event access code (e.g. UDAIPUR-24, OBEROI-GL) to unlock high-resolution photos.
            </Text>

            {modalFeedback && (
              <View
                style={[
                  styles.modalAlert,
                  modalFeedback.type === 'error' ? styles.alertError : styles.alertSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.modalAlertText,
                    modalFeedback.type === 'error' ? styles.alertTextError : styles.alertTextSuccess,
                  ]}
                >
                  {modalFeedback.message}
                </Text>
              </View>
            )}

            <View style={styles.modalInputWrap}>
              <TextInput
                style={styles.modalInput}
                value={passcodeInput}
                onChangeText={setPasscodeInput}
                placeholder="e.g. UDAIPUR-24"
                placeholderTextColor={StudioTheme.colors.outline}
                autoCapitalize="characters"
              />
            </View>

            <StudioButton
              label={unlocking ? 'Validating Token...' : 'Unlock Event Photos'}
              onPress={handleUnlockCode}
              loading={unlocking}
              variant="primary"
              size="md"
            />
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
  addCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.secondaryContainer,
  },
  addCodeBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.onSecondaryContainer,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: StudioTheme.radius.xl,
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    marginBottom: 12,
    ...StudioTheme.shadows.level1,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.onSurface,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  filterPillActive: {
    backgroundColor: StudioTheme.colors.primary,
  },
  filterPillText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: StudioTheme.colors.onSurfaceVariant,
  },
  filterPillTextActive: {
    color: StudioTheme.colors.onPrimary,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.outline,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
  },
  emptyDesc: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 6,
    maxWidth: 320,
  },
  cardsList: {
    gap: 16,
  },
  eventCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
    ...StudioTheme.shadows.level1,
  },
  cardCoverWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  cardCoverImg: {
    width: '100%',
    height: '100%',
  },
  cardCoverScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 28, 25, 0.4)',
  },
  cardBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCoverOverlayContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  cardCoverEyebrow: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: StudioTheme.colors.secondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  cardCoverTitle: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardCoverSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  cardBottomBar: {
    padding: 12,
  },
  cardMetaLeft: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSurfaceVariant,
  },
  cardActionsRow: {
    flexDirection: 'row',
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
  alertError: {
    backgroundColor: StudioTheme.colors.errorContainer,
  },
  alertSuccess: {
    backgroundColor: StudioTheme.colors.successSurface,
  },
  modalAlertText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  alertTextError: {
    color: StudioTheme.colors.onErrorContainer,
  },
  alertTextSuccess: {
    color: StudioTheme.colors.success,
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
});

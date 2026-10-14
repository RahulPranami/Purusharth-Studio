import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioHeader } from '@/components/ui/StudioHeader';
import { StudioBottomNav } from '@/components/ui/StudioBottomNav';
import { StudioIcon } from '@/components/ui/StudioIcon';
import { StudioBadge } from '@/components/ui/StudioBadge';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  cover_url: string;
  total_photos: number;
}

interface PhotoMedia {
  id: string;
  url: string;
  object_key: string;
  title: string;
  category?: string;
  time?: string;
  mime_type?: string;
  size_bytes?: number;
  created_at?: string;
}

// Fallback high-res editorial photos for Udaipur wedding if remote DB has not ingested all assets
const SAMPLE_UDAIPUR_PHOTOS: PhotoMedia[] = [
  {
    id: 'sample-1',
    object_key: 'udaipur/varmala_01.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
    title: 'The Royal Varmala Ceremony',
    category: 'Ceremony',
    time: '17:42 • PHERAS',
  },
  {
    id: 'sample-2',
    object_key: 'udaipur/bride_portrait_01.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_002.jpg',
    title: 'Editorial Bridal Portrait',
    category: 'Portraits',
    time: '16:15 • MEERA',
  },
  {
    id: 'sample-3',
    object_key: 'udaipur/mandap_ambience.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/reception/reception_001.jpg',
    title: 'Palace Courtyard Mandap',
    category: 'Ceremony',
    time: '18:10 • COURTYARD',
  },
  {
    id: 'sample-4',
    object_key: 'udaipur/sangeet_twilight.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/reception/reception_002.jpg',
    title: 'Twilight Sangeet Celebrations',
    category: 'Reception',
    time: '21:30 • SANGEET',
  },
  {
    id: 'sample-5',
    object_key: 'udaipur/groom_candid.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_003.jpg',
    title: 'Royal Baraat Arrival',
    category: 'Candids',
    time: '15:20 • BARAAT',
  },
  {
    id: 'sample-6',
    object_key: 'udaipur/reception_dance.jpg',
    url: 'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/reception/reception_003.jpg',
    title: 'First Dance Under Chandeliers',
    category: 'Reception',
    time: '22:45 • FIRST DANCE',
  },
];

export default function EventDetailScreen() {
  const router = useRouter();
  const { id, matched } = useLocalSearchParams<{ id: string; matched?: string }>();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<PhotoMedia[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Matched Photos Filter State
  const [matchedPhotoKeys, setMatchedPhotoKeys] = useState<Set<string>>(() => {
    if (matched) {
      try {
        return new Set(decodeURIComponent(matched).split(',').filter(Boolean));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  useEffect(() => {
    if (matched) {
      try {
        const keys = new Set(decodeURIComponent(matched).split(',').filter(Boolean));
        setMatchedPhotoKeys(keys);
        if (keys.size > 0) {
          setActiveCategory('my_photos');
        }
      } catch (e) {
        console.warn('Error parsing matched keys:', e);
      }
    }
  }, [matched]);

  // Filters & Layout State
  const [activeCategory, setActiveCategory] = useState<string>(() => (matched ? 'my_photos' : 'all'));
  const [gridColumns, setGridColumns] = useState<1 | 2>(2);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Lightbox Modal
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMedia | null>(null);
  const photoDimensions = '4096 × 2730 px • High-Res Master';

  const loadEventAndPhotos = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Event Details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (eventData) {
        setEvent(eventData);
      } else {
        // Fallback default for Udaipur demo
        setEvent({
          id: id as string,
          title: 'The Royal Udaipur Wedding',
          description: 'Aarav & Meera Wedding Celebration at City Palace, Udaipur',
          event_date: 'Dec 18, 2024',
          location: 'Jagmandir Island & City Palace, Udaipur',
          cover_url:
            'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
          total_photos: 840,
        });
      }

      // 2. Fetch Media for Event from Supabase
      const { data: mediaData } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (mediaData && mediaData.length > 0) {
        setPhotos(mediaData);
      } else {
        // Provide sample photos if newly initialized
        setPhotos(SAMPLE_UDAIPUR_PHOTOS);
      }
    } catch (err) {
      console.error('Error loading event media:', err);
      setPhotos(SAMPLE_UDAIPUR_PHOTOS);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadEventAndPhotos();
    } else {
      setLoading(false);
    }
  }, [id, loadEventAndPhotos]);

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleSharePhoto = async (photo: PhotoMedia) => {
    try {
      await Share.share({
        title: photo.title || event?.title || 'Purusharth Studio Photo',
        url: photo.url,
        message: `${photo.title || 'Wedding Photo'} — Purusharth Studio: ${photo.url}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (activeCategory === 'all') return true;
    if (activeCategory === 'my_photos') {
      return matchedPhotoKeys.has(p.object_key) || matchedPhotoKeys.has(p.id);
    }
    const cat = (p.category || '').toLowerCase();
    const target = activeCategory.toLowerCase();
    return cat.includes(target) || (p.title || '').toLowerCase().includes(target);
  });

  const categories = [
    { id: 'all', label: `All (${photos.length})` },
    ...(matchedPhotoKeys.size > 0
      ? [{ id: 'my_photos', label: `My Photos (${matchedPhotoKeys.size})` }]
      : []),
    { id: 'ceremony', label: 'Ceremony' },
    { id: 'reception', label: 'Reception' },
    { id: 'portraits', label: 'Portraits' },
    { id: 'candids', label: 'Candids' },
  ];

  const columnWidthPercent = gridColumns === 1 ? '100%' : '48.5%';

  return (
    <View style={styles.screenWrapper}>
      <StudioHeader title="Gallery Details" subtitle={event?.title || 'Event Gallery'} showBack />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 84 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* SECTION 1: HERO COVER SECTION */}
          <View style={styles.heroSection}>
            <Image
              source={{
                uri:
                  event?.cover_url ||
                  'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/udaipur_wedding/ceremony/ceremony_001.jpg',
              }}
              style={styles.heroCoverImg}
              contentFit="cover"
            />
            <View style={styles.heroScrim} />

            {/* Quick Share Overlay Button */}
            <TouchableOpacity
              style={styles.heroShareBtn}
              onPress={() => {
                if (event) {
                  Share.share({
                    title: event.title,
                    message: `View our private collection "${event.title}" on Purusharth Studio.`,
                  }).catch(() => {});
                }
              }}
            >
              <StudioIcon name="ios_share" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Hero Typography Overlay */}
            <View style={styles.heroMetaOverlay}>
              <View style={styles.masterPill}>
                <View style={styles.masterDot} />
                <Text style={styles.masterPillText}>Master Gallery</Text>
              </View>
              <Text style={styles.heroTitle}>{event?.title || 'The Royal Udaipur Wedding'}</Text>
              <View style={styles.heroSubRow}>
                <Text style={styles.heroSubText}>
                  {event?.location || 'Aarav & Meera • Jagmandir Island'}
                </Text>
                <StudioBadge
                  label={`${photos.length > 0 ? photos.length : 840} Originals`}
                  variant="gold"
                />
              </View>
            </View>
          </View>

          {/* SECTION 2: FACIAL RECOGNITION VIP BANNER */}
          <TouchableOpacity
            style={styles.faceBanner}
            activeOpacity={0.85}
            onPress={() => router.push(`/find-photos?eventId=${id}` as any)}
          >
            <View style={styles.faceBannerLeft}>
              <View style={styles.faceSparkleBubble}>
                <StudioIcon name="auto_awesome" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.faceBannerTitle}>Facial Recognition Ready</Text>
                <Text style={styles.faceBannerSub}>Instantly pinpoint your frame captures</Text>
              </View>
            </View>
            <View style={styles.findMineBtn}>
              <StudioIcon name="face" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.findMineBtnText}>Find Mine</Text>
            </View>
          </TouchableOpacity>

          {/* SECTION 3: STICKY EDITORIAL CONTROLS & FILTER PILLS */}
          <View style={styles.controlsBar}>
            {/* Category Filter Pills (Horizontal Scroll) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.filterPill,
                    activeCategory === cat.id && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveCategory(cat.id)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      activeCategory === cat.id && styles.filterPillTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* View Switcher & Timeline Bar */}
            <View style={styles.viewSwitcherRow}>
              <View style={styles.timelineRow}>
                <StudioIcon name="swap_vert" size={16} color={StudioTheme.colors.onSurfaceVariant} style={{ marginRight: 4 }} />
                <Text style={styles.timelineText}>Timeline (Chronological)</Text>
              </View>

              {/* 2-Column vs 1-Column Switcher */}
              <View style={styles.switcherGroup}>
                <TouchableOpacity
                  style={[styles.switcherBtn, gridColumns === 2 && styles.switcherBtnActive]}
                  onPress={() => setGridColumns(2)}
                >
                  <StudioIcon
                    name="grid_view"
                    size={16}
                    color={gridColumns === 2 ? StudioTheme.colors.onSurface : StudioTheme.colors.outline}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switcherBtn, gridColumns === 1 && styles.switcherBtnActive]}
                  onPress={() => setGridColumns(1)}
                >
                  <StudioIcon
                    name="view_agenda"
                    size={16}
                    color={gridColumns === 1 ? StudioTheme.colors.onSurface : StudioTheme.colors.outline}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SECTION 4: PHOTO GRID */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={StudioTheme.colors.secondary} />
              <Text style={styles.loadingText}>Fetching high-res originals...</Text>
            </View>
          ) : filteredPhotos.length === 0 ? (
            <View style={styles.emptyGridCard}>
              <StudioIcon name="photo_camera" size={36} color={StudioTheme.colors.outline} />
              <Text style={styles.emptyGridTitle}>No photos in this category</Text>
              <Text style={styles.emptyGridSub}>{'Select "All" to view the complete event collection.'}</Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {filteredPhotos.map((photo, index) => {
                const isFav = favorites.has(photo.id);
                return (
                  <View
                    key={photo.id || index}
                    style={[styles.photoCard, { width: columnWidthPercent }]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setSelectedPhoto(photo)}
                      style={[
                        styles.photoCoverWrapper,
                        gridColumns === 1 && styles.photoCoverWrapperFull,
                      ]}
                    >
                      <Image source={{ uri: photo.url }} style={styles.photoImage} contentFit="cover" />
                      <View style={styles.photoScrim} />

                      {/* Top Badges */}
                      <View style={styles.photoTopRow}>
                        {photo.category ? (
                          <View style={styles.catMicroBadge}>
                            <Text style={styles.catMicroText}>{photo.category}</Text>
                          </View>
                        ) : null}

                        <TouchableOpacity
                          style={styles.favBtn}
                          onPress={() => toggleFavorite(photo.id)}
                          activeOpacity={0.8}
                        >
                          <StudioIcon
                            name={isFav ? 'favorite' : 'favorite_border'}
                            size={16}
                            color={isFav ? StudioTheme.colors.error : '#FFFFFF'}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Bottom Timestamp & Caption */}
                      <View style={styles.photoBottomOverlay}>
                        <Text style={styles.photoTimestampText}>
                          {photo.time || '17:42 • PHERAS'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleSharePhoto(photo)}
                          style={styles.quickShareBtn}
                        >
                          <StudioIcon name="share" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.lightboxBackdrop}>
          {/* Top Bar */}
          <View style={[styles.lightboxTopBar, { paddingTop: Math.max(insets.top, 20) }]}>
            <TouchableOpacity
              style={styles.lightboxRoundBtn}
              onPress={() => setSelectedPhoto(null)}
            >
              <StudioIcon name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.lightboxTopActions}>
              {selectedPhoto && (
                <>
                  <TouchableOpacity
                    style={styles.lightboxRoundBtn}
                    onPress={() => toggleFavorite(selectedPhoto.id)}
                  >
                    <StudioIcon
                      name={favorites.has(selectedPhoto.id) ? 'favorite' : 'favorite_border'}
                      size={20}
                      color={favorites.has(selectedPhoto.id) ? StudioTheme.colors.error : '#FFFFFF'}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.lightboxRoundBtn}
                    onPress={() => handleSharePhoto(selectedPhoto)}
                  >
                    <StudioIcon name="share" size={20} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.lightboxRoundBtn}
                    onPress={() => {
                      if (selectedPhoto?.url) {
                        Linking.openURL(selectedPhoto.url).catch(() => {});
                      }
                    }}
                  >
                    <StudioIcon name="cloud_download" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Full-bleed Photo */}
          {selectedPhoto && (
            <View style={styles.lightboxBody}>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.lightboxMainImage}
                contentFit="contain"
              />
            </View>
          )}

          {/* Bottom Metadata Sheet */}
          {selectedPhoto && (
            <View style={[styles.lightboxBottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.metaTitleRow}>
                <Text style={styles.metaTitleText}>
                  {selectedPhoto.title || 'Master Archival Capture'}
                </Text>
                <StudioBadge label="Master Raw 4K" variant="gold" />
              </View>
              <Text style={styles.metaDimensionsText}>{photoDimensions}</Text>
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
    maxWidth: 620,
  },
  heroSection: {
    width: '100%',
    height: 240,
    borderRadius: StudioTheme.radius.xxl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    marginBottom: 16,
    ...StudioTheme.shadows.level1,
  },
  heroCoverImg: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(27, 28, 25, 0.45)',
  },
  heroShareBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  masterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: StudioTheme.radius.full,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  masterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: StudioTheme.colors.secondary,
    marginRight: 6,
  },
  masterPillText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  heroTitle: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  heroSubText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  faceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: StudioTheme.colors.secondaryContainer,
    borderRadius: StudioTheme.radius.xl,
    padding: 12,
    marginBottom: 16,
  },
  faceBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  faceSparkleBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: StudioTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  faceBannerTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: StudioTheme.colors.onSecondaryContainer,
  },
  faceBannerSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: StudioTheme.colors.onSecondaryContainer,
    opacity: 0.8,
  },
  findMineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: StudioTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: StudioTheme.radius.lg,
  },
  findMineBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  controlsBar: {
    marginBottom: 14,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  viewSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: StudioTheme.colors.onSurfaceVariant,
  },
  switcherGroup: {
    flexDirection: 'row',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    borderRadius: StudioTheme.radius.md,
    padding: 2,
  },
  switcherBtn: {
    width: 32,
    height: 28,
    borderRadius: StudioTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherBtnActive: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    ...StudioTheme.shadows.level1,
  },
  loadingBox: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: StudioTheme.colors.outline,
    marginTop: 10,
  },
  emptyGridCard: {
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
    borderRadius: StudioTheme.radius.xl,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: StudioTheme.colors.hairline,
  },
  emptyGridTitle: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    marginTop: 8,
  },
  emptyGridSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: StudioTheme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoCard: {
    borderRadius: StudioTheme.radius.lg,
    overflow: 'hidden',
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
    ...StudioTheme.shadows.level1,
  },
  photoCoverWrapper: {
    width: '100%',
    aspectRatio: 4 / 5,
    position: 'relative',
  },
  photoCoverWrapperFull: {
    aspectRatio: 16 / 11,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  photoTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catMicroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  catMicroText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: StudioTheme.colors.onSurface,
    textTransform: 'uppercase',
  },
  favBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBottomOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoTimestampText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  quickShareBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'space-between',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  lightboxRoundBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxTopActions: {
    flexDirection: 'row',
    gap: 10,
  },
  lightboxBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxMainImage: {
    width: '100%',
    height: '100%',
  },
  lightboxBottomBar: {
    backgroundColor: 'rgba(15, 15, 15, 0.9)',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  metaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaTitleText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  metaDimensionsText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 4,
  },
});

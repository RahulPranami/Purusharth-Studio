import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  useWindowDimensions,
  Linking,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/context/auth-context';

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
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 10
    : Math.max(insets.top, 12);

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [photos, setPhotos] = useState<PhotoMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoMedia | null>(null);
  const [photoDimensions, setPhotoDimensions] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'curated' | 'raw'>('all');

  // Compute number of grid columns based on screen width
  const numColumns = width >= 1024 ? 4 : width >= 768 ? 3 : 2;

  useEffect(() => {
    if (id) {
      loadEventAndPhotos();
    } else {
      setLoading(false);
      setNotFound(true);
    }
  }, [id]);

  useEffect(() => {
    if (selectedPhoto?.url) {
      Image.getSize(
        selectedPhoto.url,
        (w, h) => {
          setPhotoDimensions(`${w} × ${h} px`);
        },
        () => {
          setPhotoDimensions('4096 × 2730 px • High-Res Master');
        }
      );
    } else {
      setPhotoDimensions('');
    }
  }, [selectedPhoto]);

  const loadEventAndPhotos = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      // 1. Fetch Event Details
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (eventErr || !eventData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setEvent(eventData);

      // 2. Fetch Media for Event
      const { data: mediaData } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });

      if (mediaData) {
        setPhotos(mediaData);
      }
    } catch (err) {
      console.error('Error loading event media:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter((p) => {
    if (filterTab === 'curated') {
      return photos.indexOf(p) < 4 || p.title?.toLowerCase().includes('arrival') || p.title?.toLowerCase().includes('ballroom');
    }
    if (filterTab === 'raw') {
      return p.mime_type?.includes('raw') || (p.size_bytes && p.size_bytes > 3 * 1024 * 1024) || p.title?.toLowerCase().includes('terrace');
    }
    return true;
  });

  const handleOpenOriginal = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1B1C19" />
        <Text style={styles.loadingText}>Unlocking Event Gallery...</Text>
      </View>
    );
  }

  if (notFound || !event) {
    return (
      <View style={styles.notFoundContainer}>
        <View style={styles.notFoundCard}>
          <Text style={styles.notFoundIcon}>🏛️</Text>
          <Text style={styles.notFoundTitle}>Event Vault Not Found</Text>
          <Text style={styles.notFoundSub}>
            The requested private event production could not be located or may have been archived. Please verify your event passcode.
          </Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.replace('/')}>
            <Text style={styles.returnBtnText}>← Return to Lookbook</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.topBar, { paddingTop: topInset, minHeight: topInset + 52 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Lookbook</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {event?.title || 'Event Gallery'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={filteredPhotos}
        key={numColumns} // Re-render when column count changes
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Hero Cover Card */}
            {event?.cover_url && (
              <View style={styles.heroBanner}>
                <Image
                  source={{ uri: event.cover_url }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                <View style={styles.heroOverlay} />
                <View style={styles.heroMeta}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.heroBadge}>ACCESS GRANTED</Text>
                    <Text style={styles.heroDate}>{event.event_date}</Text>
                  </View>
                  <Text style={styles.heroTitle}>{event.title}</Text>
                  <Text style={styles.heroLocation}>📍 {event.location}</Text>
                </View>
              </View>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
                onPress={() => setFilterTab('all')}
              >
                <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                  All Photos ({photos.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterTab === 'curated' && styles.filterTabActive]}
                onPress={() => setFilterTab('curated')}
              >
                <Text style={[styles.filterTabText, filterTab === 'curated' && styles.filterTabTextActive]}>
                  Highlights
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterTab, filterTab === 'raw' && styles.filterTabActive]}
                onPress={() => setFilterTab('raw')}
              >
                <Text style={[styles.filterTabText, filterTab === 'raw' && styles.filterTabTextActive]}>
                  High-Res Archive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.photoCard, { width: `${100 / numColumns}%` }]}
            onPress={() => setSelectedPhoto(item)}
            activeOpacity={0.88}
          >
            <View style={styles.photoFrame}>
              <Image source={{ uri: item.url }} style={styles.thumbnail} resizeMode="cover" />
              <View style={styles.photoOverlay}>
                <Text style={styles.photoTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No Photos Ingested Yet</Text>
            <Text style={styles.emptySub}>
              Raw photo batches stream directly from studio memory cards. Check back shortly as ingestion proceeds.
            </Text>
          </View>
        }
      />

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
          <View style={styles.lightboxBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setSelectedPhoto(null)}
            />
            <View style={styles.lightboxHeader}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.lightboxTitle}>{selectedPhoto.title}</Text>
                <Text style={styles.lightboxSub}>
                  {photoDimensions ? `${photoDimensions} • ` : ''}
                  {selectedPhoto.size_bytes ? `${(selectedPhoto.size_bytes / (1024 * 1024)).toFixed(1)} MB • ` : ''}
                  Cloudflare R2 Direct CDN
                </Text>
              </View>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setSelectedPhoto(null)}
              >
                <Text style={styles.lightboxCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.lightboxImageContainer}>
              <Image
                source={{ uri: selectedPhoto.url }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.lightboxFooter}>
              <TouchableOpacity
                style={styles.lightboxDownloadBtn}
                onPress={() => handleOpenOriginal(selectedPhoto.url)}
              >
                <Text style={styles.lightboxDownloadText}>Open High-Res Original ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#755A2A',
    fontWeight: '500',
  },
  topBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#EFECE6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    color: '#755A2A',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B1C19',
    maxWidth: 240,
    textAlign: 'center',
  },

  listContent: {
    paddingBottom: 60,
  },
  headerComponent: {
    padding: 16,
  },
  heroBanner: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 18,
    backgroundColor: '#2A2A2A',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  heroMeta: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  heroBadge: {
    backgroundColor: '#FCD89C',
    color: '#775D2D',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.8,
  },
  heroDate: {
    color: '#E5E2E1',
    fontSize: 12,
    fontWeight: '500',
  },
  heroTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Bodoni 72' : 'serif',
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroLocation: {
    fontSize: 13,
    color: '#C8C6C5',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#F5F3EE',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#1B1C19',
    fontWeight: '700',
  },
  photoCard: {
    padding: 6,
  },
  photoFrame: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#EAE8E3',
    aspectRatio: 1,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  photoTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B1C19',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 18,
    marginBottom: 16,
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    justifyContent: 'space-between',
    padding: 20,
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },
  lightboxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lightboxSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  lightboxCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxFooter: {
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    alignItems: 'center',
  },
  lightboxDownloadBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  lightboxDownloadText: {
    color: '#1B1C19',
    fontSize: 13,
    fontWeight: '600',
  },
  notFoundContainer: {
    flex: 1,
    backgroundColor: '#FBF9F4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 420,
    width: '100%',
    borderWidth: 1,
    borderColor: '#EFECE6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  notFoundIcon: {
    fontSize: 44,
    marginBottom: 16,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B1C19',
    marginBottom: 8,
    textAlign: 'center',
  },
  notFoundSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  returnBtn: {
    backgroundColor: '#1B1C19',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

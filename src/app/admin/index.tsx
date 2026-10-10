import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { supabase } from '@/utils/supabase';

interface EventSummary {
  id: string;
  title: string;
  event_date: string;
  location: string;
  event_code: string;
  status: string;
  cover_image_url: string;
  total_photos: number;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024;

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPhotosCount, setTotalPhotosCount] = useState(0);
  const [totalAdminsCount, setTotalAdminsCount] = useState(1);
  const [totalAttendeesCount, setTotalAttendeesCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: dbEvents, error: eventsErr } = await supabase
          .from('events')
          .select('*, event_codes(code)')
          .order('created_at', { ascending: false });

        if (!eventsErr && dbEvents && dbEvents.length > 0) {
          const mapped: EventSummary[] = dbEvents.map((e: any) => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date || 'Upcoming',
            location: e.location || 'Private Venue',
            event_code: e.event_codes?.[0]?.code || e.id.slice(0, 8).toUpperCase(),
            status: e.status || 'active',
            cover_image_url:
              e.cover_url ||
              'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80',
            total_photos: e.total_photos || 0,
          }));
          setEvents(mapped);
          const total = dbEvents.reduce(
            (acc: number, curr: any) => acc + (curr.total_photos || 0),
            0
          );
          setTotalPhotosCount(total);
        } else {
          setEvents([]);
        }

        const { count: adminsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('role', ['admin', 'super_admin']);
        if (adminsCount !== null) setTotalAdminsCount(adminsCount);

        const { count: membersCount } = await supabase
          .from('event_members')
          .select('*', { count: 'exact', head: true });
        if (membersCount !== null) setTotalAttendeesCount(membersCount);
      } catch (err) {
        console.warn('Error loading admin overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <AdminLayout breadcrumbs={['Console', 'Overview']}>
      {/* Clean Studio Header Ribbon */}
      <View style={styles.headerRibbon}>
        <View style={styles.headerInfo}>
          <Text style={styles.mainTitle}>Studio Operations</Text>
          <Text style={styles.subTitle}>
            Super Admin dashboard for Purusharth Studio. Overview of live productions, cloud archive, and team access.
          </Text>
        </View>

        {/* Action Toolbar */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={styles.uploadPhotosBtn}
            onPress={() => router.push('/admin/uploads' as any)}
          >
            <AdminIcon name="cloud_upload" size={18} color="#ffffff" />
            <Text style={styles.uploadPhotosBtnText}>Upload Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createEventButton}
            onPress={() => router.push('/admin/events' as any)}
          >
            <AdminIcon name="add" size={18} color={AdminColors.primary} />
            <Text style={styles.createEventButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Cards Grid */}
      <View style={styles.kpiGrid}>
        {/* KPI 1: Events */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL EVENTS</Text>
              <Text style={styles.kpiValue}>{events.length}</Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="calendar_month" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <Text style={styles.kpiSubMetric}>Active in catalog</Text>
          </View>
        </View>

        {/* KPI 2: Total Photos */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL PHOTOS</Text>
              <Text style={styles.kpiValue}>
                {totalPhotosCount.toLocaleString()}
              </Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="photo_camera" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <Text style={styles.kpiSubMetric}>Cloudflare R2 archive</Text>
          </View>
        </View>

        {/* KPI 3: Studio Admins */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>STUDIO ADMINS</Text>
              <Text style={styles.kpiValue}>{totalAdminsCount}</Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon
                name="admin_panel_settings"
                size={22}
                color={AdminColors.primary}
              />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <Text style={styles.kpiSubMetric}>Authorized accounts</Text>
          </View>
        </View>

        {/* KPI 4: Attendees */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>GUEST ENROLLMENTS</Text>
              <Text style={styles.kpiValue}>{totalAttendeesCount}</Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="how_to_reg" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <Text style={styles.kpiSubMetric}>Passcodes redeemed</Text>
          </View>
        </View>
      </View>

      {/* Main Section: Active Events Directory */}
      <View style={styles.panelCard}>
        <View style={styles.panelHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={styles.panelTitle}>Active Events & Productions</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{events.length} Live</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/admin/events' as any)}
            style={styles.viewAllBtn}
          >
            <Text style={styles.viewAllText}>Manage all events</Text>
            <AdminIcon name="arrow_forward" size={16} color={AdminColors.primary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={AdminColors.primary} />
            <Text style={styles.emptyText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <AdminIcon name="event_busy" size={36} color={AdminColors.outline} />
            <Text style={styles.emptyTitle}>No events registered yet</Text>
            <Text style={styles.emptyText}>
              Create your first production to start uploading photos and generating passcodes.
            </Text>
            <TouchableOpacity
              style={styles.createFirstBtn}
              onPress={() => router.push('/admin/events' as any)}
            >
              <Text style={styles.createFirstBtnText}>Create First Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {events.map((evt) => (
              <View key={evt.id} style={styles.eventRow}>
                {/* Event Cover and Info */}
                <View style={styles.eventLeftGroup}>
                  <Image
                    source={{ uri: evt.cover_image_url }}
                    style={styles.eventThumbnail}
                  />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventItemTitle} numberOfLines={1}>
                      {evt.title}
                    </Text>
                    <View style={styles.eventMetaRow}>
                      <Text style={styles.eventItemMeta}>
                        {evt.event_date} • {evt.location}
                      </Text>
                      <View style={styles.codePill}>
                        <AdminIcon name="vpn_key" size={12} color={AdminColors.secondary} />
                        <Text style={styles.codePillText}>{evt.event_code}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Event Photo Count & Status */}
                <View style={styles.eventMiddleGroup}>
                  <View style={styles.photosBadge}>
                    <AdminIcon name="photo_library" size={14} color={AdminColors.primary} />
                    <Text style={styles.photosBadgeText}>
                      {evt.total_photos.toLocaleString()} Photos
                    </Text>
                  </View>
                </View>

                {/* Event Actions */}
                <View style={styles.eventActionsGroup}>
                  <TouchableOpacity
                    style={styles.actionBtnUpload}
                    onPress={() => router.push('/admin/uploads' as any)}
                  >
                    <AdminIcon name="cloud_upload" size={15} color="#ffffff" />
                    <Text style={styles.actionBtnUploadText}>Upload</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionBtnGallery}
                    onPress={() => router.push(`/event/${evt.id}` as any)}
                  >
                    <AdminIcon name="visibility" size={15} color={AdminColors.primary} />
                    <Text style={styles.actionBtnGalleryText}>View Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Studio Operations Grid */}
      <View style={[styles.quickToolsGrid, !isLargeScreen && styles.quickToolsGridStacked]}>
        {/* Tool 1 */}
        <TouchableOpacity
          style={styles.quickToolCard}
          onPress={() => router.push('/admin/uploads' as any)}
        >
          <View style={styles.quickToolIconBox}>
            <AdminIcon name="cloud_upload" size={24} color={AdminColors.primary} />
          </View>
          <Text style={styles.quickToolTitle}>Photo Ingestion & R2 Sync</Text>
          <Text style={styles.quickToolDesc}>
            Upload high-resolution photographs directly to Cloudflare R2 bucket with automated facial indexing.
          </Text>
          <View style={styles.quickToolLinkRow}>
            <Text style={styles.quickToolLinkText}>Go to Photo Uploads</Text>
            <AdminIcon name="arrow_forward" size={15} color={AdminColors.primary} />
          </View>
        </TouchableOpacity>

        {/* Tool 2 */}
        <TouchableOpacity
          style={styles.quickToolCard}
          onPress={() => router.push('/admin/events' as any)}
        >
          <View style={styles.quickToolIconBox}>
            <AdminIcon name="event" size={24} color={AdminColors.primary} />
          </View>
          <Text style={styles.quickToolTitle}>Event Management</Text>
          <Text style={styles.quickToolDesc}>
            Create new event productions, configure VIP passcodes, and customize lookbook galleries.
          </Text>
          <View style={styles.quickToolLinkRow}>
            <Text style={styles.quickToolLinkText}>Manage Events Directory</Text>
            <AdminIcon name="arrow_forward" size={15} color={AdminColors.primary} />
          </View>
        </TouchableOpacity>

        {/* Tool 3 */}
        <TouchableOpacity
          style={styles.quickToolCard}
          onPress={() => router.push('/admin/admins' as any)}
        >
          <View style={styles.quickToolIconBox}>
            <AdminIcon name="badge" size={24} color={AdminColors.primary} />
          </View>
          <Text style={styles.quickToolTitle}>Team Clearances & Invites</Text>
          <Text style={styles.quickToolDesc}>
            Generate admin invite codes for second shooters and manage studio clearances.
          </Text>
          <View style={styles.quickToolLinkRow}>
            <Text style={styles.quickToolLinkText}>Manage Admins</Text>
            <AdminIcon name="arrow_forward" size={15} color={AdminColors.primary} />
          </View>
        </TouchableOpacity>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  headerRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  headerInfo: {
    flex: 1,
    minWidth: 280,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AdminColors.onSurface,
    letterSpacing: -0.4,
  },
  subTitle: {
    fontSize: 13.5,
    color: AdminColors.secondary,
    marginTop: 4,
    lineHeight: 20,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadPhotosBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: AdminColors.primaryContainer,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  uploadPhotosBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  createEventButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: AdminColors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createEventButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.primary,
  },

  // KPI Grid
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.3)',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: AdminColors.secondary,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 6,
  },
  kpiIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBottom: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.2)',
  },
  kpiSubMetric: {
    fontSize: 12,
    color: AdminColors.secondary,
  },

  // Panel Card (Active Events Directory)
  panelCard: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.3)',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainer,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.primary,
  },

  // Event Rows
  eventsList: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    backgroundColor: AdminColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.2)',
    flexWrap: 'wrap',
    gap: 14,
  },
  eventLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 2,
    minWidth: 260,
  },
  eventThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceVariant,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  eventItemMeta: {
    fontSize: 12,
    color: AdminColors.secondary,
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AdminColors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codePillText: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  eventMiddleGroup: {
    flex: 1,
    minWidth: 120,
    alignItems: 'flex-start',
  },
  photosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  photosBadgeText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  eventActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
  },
  actionBtnUploadText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  actionBtnGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainer,
  },
  actionBtnGalleryText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.primary,
  },

  // Empty State
  emptyState: {
    padding: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: AdminColors.secondary,
    textAlign: 'center',
    maxWidth: 400,
  },
  createFirstBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
  },
  createFirstBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Quick Tools Grid
  quickToolsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  quickToolsGridStacked: {
    flexDirection: 'column',
  },
  quickToolCard: {
    flex: 1,
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.3)',
    gap: 8,
  },
  quickToolIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickToolTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  quickToolDesc: {
    fontSize: 12.5,
    color: AdminColors.secondary,
    lineHeight: 18,
    flex: 1,
  },
  quickToolLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  quickToolLinkText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.primary,
  },
});

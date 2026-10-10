import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
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
  const isLargeScreen = width >= 1100;
  const isTabletOrUp = width >= 768;

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [totalPhotosCount, setTotalPhotosCount] = useState(0);
  const [totalAdminsCount, setTotalAdminsCount] = useState(1);
  const [totalAttendeesCount, setTotalAttendeesCount] = useState(0);
  const [timeframe, setTimeframe] = useState('Last 30 Days');
  const [viewBy, setViewBy] = useState<'day' | 'event'>('day');

  useEffect(() => {
    async function loadData() {
      try {
        const { data: dbEvents } = await supabase
          .from('events')
          .select('*, event_codes(code)')
          .order('created_at', { ascending: false });

        if (dbEvents && dbEvents.length > 0) {
          const mapped: EventSummary[] = dbEvents.map((e: any) => ({
            id: e.id,
            title: e.title,
            event_date: e.event_date || 'Upcoming',
            location: e.location || 'Private Venue',
            event_code: e.event_codes?.[0]?.code || e.id.slice(0, 8).toUpperCase(),
            status: e.status || 'active',
            cover_image_url: e.cover_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80',
            total_photos: e.total_photos || 0,
          }));
          setEvents(mapped);
          const total = dbEvents.reduce((acc: number, curr: any) => acc + (curr.total_photos || 0), 0);
          setTotalPhotosCount(total);
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
        console.warn('Error loading admin telemetry:', err);
      }
    }
    loadData();
  }, []);

  const displayEvents = events;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return {
          bg: '#ecfdf5',
          text: '#047857',
          dot: '#10b981',
          label: 'Published',
        };
      case 'processing':
        return {
          bg: '#fffbeb',
          text: '#b45309',
          dot: '#f59e0b',
          label: 'Processing 84%',
        };
      case 'completed':
        return {
          bg: AdminColors.surfaceContainer,
          text: AdminColors.secondary,
          dot: AdminColors.secondary,
          label: 'Completed',
        };
      case 'draft':
      default:
        return {
          bg: AdminColors.surfaceContainer,
          text: AdminColors.secondary,
          dot: AdminColors.outline,
          label: 'Draft',
        };
    }
  };

  return (
    <AdminLayout breadcrumbs={['Console', 'Superadmin Overview']}>
      {/* Dynamic Greeting & Telemetry Header */}
      <View style={styles.headerRibbon}>
        <View style={styles.headerInfo}>
          <View style={styles.telemetryTagRow}>
            <View style={styles.telemetryPill}>
              <Text style={styles.telemetryPillText}>
                SUPERADMIN SYSTEM TELEMETRY
              </Text>
            </View>
            <Text style={styles.clusterIdText}>Purusharth Production Mainframe</Text>
          </View>
          <Text style={styles.mainTitle}>Welcome back, Super Admin</Text>
          <Text style={styles.subTitle}>
            Here's what's happening with your event photo platform across{' '}
            {displayEvents.length} live productions.
          </Text>
        </View>

        {/* Action Toolbar */}
        <View style={styles.toolbarRow}>
          <TouchableOpacity
            style={styles.timeframeButton}
            onPress={() =>
              setTimeframe(
                timeframe === 'Last 30 Days' ? 'Last 7 Days' : 'Last 30 Days'
              )
            }
          >
            <AdminIcon name="calendar_today" size={16} color={AdminColors.secondary} />
            <Text style={styles.timeframeButtonText}>{timeframe}</Text>
            <AdminIcon name="expand_more" size={16} color={AdminColors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createEventButton}
            onPress={() => router.push('/admin/events' as any)}
          >
            <AdminIcon name="add" size={19} color="#ffffff" />
            <Text style={styles.createEventButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 1: 4 High-Density Operational KPI Cards */}
      <View style={styles.kpiGrid}>
        {/* KPI 1: Events */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL EVENTS</Text>
              <Text style={styles.kpiValue}>
                {events.length}
              </Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="calendar_month" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <View style={styles.growthBadge}>
              <View style={styles.growthDot} />
              <Text style={styles.growthText}>Live Catalog</Text>
            </View>
            <Text style={styles.kpiSubMetric}>100% active</Text>
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
            <View style={styles.growthBadge}>
              <AdminIcon name="trending_up" size={14} color="#047857" />
              <Text style={styles.growthText}>R2 Direct Storage</Text>
            </View>
            <Text style={styles.kpiSubMetric}>Cloudflare APAC</Text>
          </View>
        </View>

        {/* KPI 3: Total Admins */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL ADMINS</Text>
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
            <View style={styles.goldBadge}>
              <View style={styles.goldDot} />
              <Text style={styles.goldBadgeText}>{totalAdminsCount} active</Text>
            </View>
            <Text style={styles.kpiSubMetric}>Clearance granted</Text>
          </View>
        </View>

        {/* KPI 4: Attendees */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>TOTAL ATTENDEES</Text>
              <Text style={styles.kpiValue}>{totalAttendeesCount}</Text>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="how_to_reg" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <View style={styles.growthBadge}>
              <AdminIcon name="auto_awesome" size={14} color="#047857" />
              <Text style={styles.growthText}>94.2% match rate</Text>
            </View>
            <Text style={styles.kpiSubMetric}>+328 this week</Text>
          </View>
        </View>
      </View>

      {/* Row 2: Ingestion Chart & Recent Events */}
      <View style={[styles.twoColRow, !isLargeScreen && styles.twoColRowStacked]}>
        {/* Left: Ingestion Activity Monitor */}
        <View style={[styles.panelCard, { flex: 7 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>
                Photo Upload & Ingestion Activity
              </Text>
              <Text style={styles.panelSubtitle}>
                {totalPhotosCount.toLocaleString()} photos uploaded and indexed over the
                current billing cycle
              </Text>
            </View>
            <View style={styles.pillToggle}>
              <TouchableOpacity
                onPress={() => setViewBy('day')}
                style={[
                  styles.pillToggleBtn,
                  viewBy === 'day' && styles.pillToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.pillToggleText,
                    viewBy === 'day' && styles.pillToggleTextActive,
                  ]}
                >
                  By Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewBy('event')}
                style={[
                  styles.pillToggleBtn,
                  viewBy === 'event' && styles.pillToggleBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.pillToggleText,
                    viewBy === 'event' && styles.pillToggleTextActive,
                  ]}
                >
                  By Event
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Telemetry Visual Activity Curve / Bars */}
          <View style={styles.chartContainer}>
            {/* Peak Callout Badge */}
            <View style={styles.peakCallout}>
              <View style={styles.peakPingDot} />
              <Text style={styles.peakCalloutText}>
                Annual Tech Summit:{' '}
                <Text style={styles.peakCalloutBold}>4,820 photos</Text> (May 24)
              </Text>
            </View>

            {/* Custom high-res bar chart visualization */}
            <View style={styles.barsVisualWrapper}>
              {[
                { day: '01', height: 45, label: 'May 01' },
                { day: '04', height: 62, label: '' },
                { day: '08', height: 85, label: 'May 08' },
                { day: '12', height: 50, label: '' },
                { day: '15', height: 110, label: 'May 15' },
                { day: '18', height: 90, label: '' },
                { day: '21', height: 135, label: '' },
                { day: '24', height: 180, label: 'May 24 (Peak)', peak: true },
                { day: '27', height: 75, label: '' },
                { day: '30', height: 95, label: 'May 30' },
              ].map((bar, i) => (
                <View key={i} style={styles.barColumn}>
                  <View
                    style={[
                      styles.chartBar,
                      { height: bar.height },
                      bar.peak && styles.chartBarPeak,
                    ]}
                  />
                  {bar.label ? (
                    <Text
                      style={[
                        styles.axisText,
                        bar.peak && styles.axisTextPeak,
                      ]}
                    >
                      {bar.label}
                    </Text>
                  ) : (
                    <Text style={styles.axisTextPlaceholder}>•</Text>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Pipeline Telemetry Sub-row */}
          <View style={styles.pipelineSubRow}>
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineStatLabel}>FACE DETECTION</Text>
              <Text style={styles.pipelineStatValue}>99.4%</Text>
              <Text style={styles.pipelineStatMetaSuccess}>Model v4.8 deployed</Text>
            </View>
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineStatLabel}>AVG INGEST LATENCY</Text>
              <Text style={styles.pipelineStatValue}>1.2s</Text>
              <Text style={styles.pipelineStatMeta}>per 24MB RAW</Text>
            </View>
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineStatLabel}>ACTIVE WORKERS</Text>
              <Text style={styles.pipelineStatValue}>28 Nodes</Text>
              <Text style={styles.pipelineStatMetaSuccess}>100% capacity</Text>
            </View>
          </View>
        </View>

        {/* Right: Recent Events Registry */}
        <View style={[styles.panelCard, { flex: 5 }]}>
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.panelTitle}>Recent Events</Text>
              <View style={styles.liveTag}>
                <Text style={styles.liveTagText}>12 Live</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/admin/events' as any)}
              style={styles.viewAllBtn}
            >
              <Text style={styles.viewAllText}>View all</Text>
              <AdminIcon name="chevron_right" size={16} color={AdminColors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.eventsList}>
            {displayEvents.map((evt) => {
              const statusCfg = getStatusBadge(evt.status);
              return (
                <TouchableOpacity
                  key={evt.id}
                  style={styles.eventItemRow}
                  onPress={() => router.push('/admin/events' as any)}
                >
                  <View style={styles.eventLeftGroup}>
                    <Image
                      source={{ uri: evt.cover_image_url }}
                      style={styles.eventThumbnail}
                    />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventItemTitle} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <Text style={styles.eventItemMeta}>
                        {evt.event_date} • {evt.total_photos?.toLocaleString() || 0}{' '}
                        photos
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: statusCfg.bg },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: statusCfg.dot },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: statusCfg.text },
                      ]}
                    >
                      {statusCfg.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.eventsFooter}>
            <Text style={styles.eventsFooterText}>
              Average Indexing: 4,120 photos/event
            </Text>
            <TouchableOpacity onPress={() => router.push('/admin/uploads' as any)}>
              <Text style={styles.batchOpLink}>Batch Uploads →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Row 3: Storage Quota & Realtime Activity Stream */}
      <View style={[styles.twoColRow, !isLargeScreen && styles.twoColRowStacked]}>
        {/* Left: Storage Quota */}
        <View style={[styles.panelCard, { flex: 6 }]}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Storage & Processing Quota</Text>
              <Text style={styles.panelSubtitle}>
                Tier 2 Dedicated Cloud Storage Bucket (AWS S3 & Cloudflare R2)
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/admin/uploads' as any)}
              style={styles.manageStorageBtn}
            >
              <AdminIcon name="tune" size={15} color={AdminColors.primary} />
              <Text style={styles.manageStorageText}>Manage storage</Text>
            </TouchableOpacity>
          </View>

          {/* Numbers */}
          <View style={styles.storageNumbersRow}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={styles.storageBigNumber}>428 GB</Text>
              <Text style={styles.storageSubText}>used of 1 TB</Text>
            </View>
            <Text style={styles.storagePercentText}>42.8% Capacity</Text>
          </View>

          {/* Segmented Bar */}
          <View style={styles.segmentedBar}>
            <View
              style={[
                styles.segment,
                { width: '80%', backgroundColor: AdminColors.primaryContainer },
              ]}
            />
            <View
              style={[
                styles.segment,
                { width: '15%', backgroundColor: AdminColors.tertiaryContainer },
              ]}
            />
            <View
              style={[
                styles.segment,
                { width: '5%', backgroundColor: AdminColors.secondary },
              ]}
            />
          </View>

          {/* Segment Breakdown */}
          <View style={styles.storageBreakdownGrid}>
            <View style={styles.storageSegmentItem}>
              <View
                style={[
                  styles.segmentBoxDot,
                  { backgroundColor: AdminColors.primaryContainer },
                ]}
              />
              <View>
                <Text style={styles.segmentName}>RAW & Masters</Text>
                <Text style={styles.segmentSize}>342 GB</Text>
                <Text style={styles.segmentShare}>80.0% of used</Text>
              </View>
            </View>
            <View style={styles.storageSegmentItem}>
              <View
                style={[
                  styles.segmentBoxDot,
                  { backgroundColor: AdminColors.tertiaryContainer },
                ]}
              />
              <View>
                <Text style={styles.segmentName}>Web Derivatives</Text>
                <Text style={styles.segmentSize}>64 GB</Text>
                <Text style={styles.segmentShare}>15.0% of used</Text>
              </View>
            </View>
            <View style={styles.storageSegmentItem}>
              <View
                style={[
                  styles.segmentBoxDot,
                  { backgroundColor: AdminColors.secondary },
                ]}
              />
              <View>
                <Text style={styles.segmentName}>AI Vectors</Text>
                <Text style={styles.segmentSize}>22 GB</Text>
                <Text style={styles.segmentShare}>5.0% of used</Text>
              </View>
            </View>
          </View>

          {/* Forecast Pill */}
          <View style={styles.forecastPillBox}>
            <AdminIcon name="verified" size={17} color="#059669" />
            <Text style={styles.forecastText}>
              Storage healthy. Projected capacity reached in{' '}
              <Text style={{ fontWeight: '700', color: AdminColors.onSurface }}>
                4.2 months
              </Text>{' '}
              at current growth rate.
            </Text>
          </View>
        </View>

        {/* Right: System Activity Log */}
        <View style={[styles.panelCard, { flex: 6 }]}>
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.panelTitle}>System Activity Log</Text>
              <View style={styles.activityPulseDot} />
            </View>
            <Text style={styles.workerActiveText}>Worker queue active</Text>
          </View>

          {/* Activity Feed */}
          <View style={styles.activityTimeline}>
            {[
              {
                title: 'The Royal Udaipur Wedding',
                meta: '2,450 photos uploaded by Devansh Kapoor',
                time: '12m ago',
                icon: 'cloud_upload',
                bg: AdminColors.primaryFixed,
                color: AdminColors.primary,
              },
              {
                title: 'Annual Tech Summit 2025',
                meta: '820 attendee face vectors generated and published',
                time: '45m ago',
                icon: 'fingerprint',
                bg: AdminColors.surfaceContainerHigh,
                color: AdminColors.primary,
              },
              {
                title: 'Global FinTech Expo',
                meta: 'Background worker indexed 1,200 photos via batch #882',
                time: '1h ago',
                icon: 'smart_toy',
                bg: '#fef3c7',
                color: '#92400e',
              },
              {
                title: 'Oberoi Heritage Gala',
                meta: 'Devansh approved color grading proxy exports',
                time: '3h ago',
                icon: 'verified',
                bg: '#d1fae5',
                color: '#065f46',
              },
            ].map((act, i) => (
              <View key={i} style={styles.activityItem}>
                <View style={[styles.activityIconCircle, { backgroundColor: act.bg }]}>
                  <AdminIcon name={act.icon} size={15} color={act.color} />
                </View>
                <View style={styles.activityTextContent}>
                  <View style={styles.activityTitleRow}>
                    <Text style={styles.activityEventTitle}>{act.title}</Text>
                    <Text style={styles.activityTime}>{act.time}</Text>
                  </View>
                  <Text style={styles.activityMetaText}>{act.meta}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  headerRibbon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 28,
  },
  headerInfo: {
    flex: 1,
    minWidth: 280,
  },
  telemetryTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  telemetryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.secondaryContainer,
  },
  telemetryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.onSecondaryFixed,
    letterSpacing: 0.6,
  },
  clusterIdText: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AdminColors.onSurface,
    letterSpacing: -0.5,
  },
  subTitle: {
    fontSize: 13.5,
    color: AdminColors.secondary,
    marginTop: 4,
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeframeButton: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  timeframeButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  createEventButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: AdminColors.primaryContainer,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  createEventButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
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
    minWidth: 220,
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
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
    width: 40,
    height: 40,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  growthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  growthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AdminColors.primaryFixed,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: AdminColors.gold,
  },
  goldBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.gold,
  },
  kpiSubMetric: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  // Two Col Rows
  twoColRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  twoColRowStacked: {
    flexDirection: 'column',
  },
  panelCard: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 22,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 8,
    elevation: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  panelSubtitle: {
    fontSize: 12,
    color: AdminColors.secondary,
    marginTop: 2,
  },
  pillToggle: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceContainer,
    padding: 3,
    borderRadius: 8,
  },
  pillToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pillToggleBtnActive: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  pillToggleText: {
    fontSize: 11,
    fontWeight: '500',
    color: AdminColors.secondary,
  },
  pillToggleTextActive: {
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  // Chart
  chartContainer: {
    height: 220,
    marginTop: 10,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  peakCallout: {
    position: 'absolute',
    top: 0,
    right: 40,
    backgroundColor: AdminColors.inverseSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  peakPingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: AdminColors.primaryContainer,
  },
  peakCalloutText: {
    fontSize: 11.5,
    color: '#ffffff',
  },
  peakCalloutBold: {
    fontWeight: '700',
    color: AdminColors.primaryFixed,
    fontFamily: AdminTypography.fontFamily.mono,
  },
  barsVisualWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 170,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.surfaceVariant,
    paddingBottom: 4,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 22,
    backgroundColor: 'rgba(117, 90, 42, 0.22)',
    borderRadius: 4,
  },
  chartBarPeak: {
    backgroundColor: AdminColors.primaryContainer,
  },
  axisText: {
    fontSize: 10,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.outline,
    marginTop: 6,
  },
  axisTextPeak: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  axisTextPlaceholder: {
    fontSize: 10,
    color: 'transparent',
    marginTop: 6,
  },
  pipelineSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 14,
    borderRadius: 10,
    marginTop: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pipelineStat: {
    flex: 1,
    minWidth: 100,
  },
  pipelineStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  pipelineStatValue: {
    fontSize: 17,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 2,
  },
  pipelineStatMetaSuccess: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  pipelineStatMeta: {
    fontSize: 11,
    color: AdminColors.secondary,
    marginTop: 1,
  },
  // Events right card
  liveTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainer,
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.secondary,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  eventsList: {
    gap: 8,
    marginTop: 4,
  },
  eventItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    backgroundColor: AdminColors.surface,
  },
  eventLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  eventThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceVariant,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventItemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  eventItemMeta: {
    fontSize: 11.5,
    color: AdminColors.secondary,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  eventsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.25)',
  },
  eventsFooterText: {
    fontSize: 12,
    color: AdminColors.secondary,
  },
  batchOpLink: {
    fontSize: 12,
    fontFamily: AdminTypography.fontFamily.mono,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  // Storage Quota
  manageStorageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainer,
  },
  manageStorageText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  storageNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 8,
  },
  storageBigNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  storageSubText: {
    fontSize: 13,
    color: AdminColors.secondary,
  },
  storagePercentText: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  segmentedBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: AdminColors.surfaceContainer,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
    marginBottom: 16,
  },
  segment: {
    height: '100%',
  },
  storageBreakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  storageSegmentItem: {
    flex: 1,
    minWidth: 110,
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
  },
  segmentBoxDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: 3,
  },
  segmentName: {
    fontSize: 10.5,
    color: AdminColors.secondary,
  },
  segmentSize: {
    fontSize: 13,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 2,
  },
  segmentShare: {
    fontSize: 10,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.outline,
  },
  forecastPillBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  forecastText: {
    fontSize: 12,
    color: AdminColors.secondary,
    flex: 1,
  },
  // Activity Log
  activityPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  workerActiveText: {
    fontSize: 11.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  activityTimeline: {
    gap: 14,
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityEventTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  activityTime: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.outline,
  },
  activityMetaText: {
    fontSize: 12,
    color: AdminColors.secondary,
    marginTop: 2,
  },
});

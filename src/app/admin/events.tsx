import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { supabase } from '@/utils/supabase';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  location: string;
  event_code: string;
  status: string;
  cover_image_url: string;
  total_photos: number;
  faces_indexed: number;
  attendees_enrolled: number;
  assigned_admins?: any;
}

export default function AdminEventsDirectoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Create Event Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('2025-06-15');
  const [formLocation, setFormLocation] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState(
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'
  );

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*, event_codes(code)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          event_date: e.event_date || 'Upcoming',
          location: e.location || 'Private Venue',
          event_code: e.event_codes?.[0]?.code || e.id.slice(0, 8).toUpperCase(),
          status: e.status || 'published',
          cover_image_url: e.cover_url || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
          total_photos: e.total_photos || 0,
          faces_indexed: 0,
          attendees_enrolled: 0,
          assigned_admins: [{ name: 'Studio Superadmin', initials: 'SA' }],
        }));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (err) {
      console.warn('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async () => {
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    const newCode = (
      formCode.trim().toUpperCase() ||
      formTitle.substring(0, 4).toUpperCase() + '-' + Math.floor(Math.random() * 90 + 10)
    ).replace(/[^A-Z0-9-]/g, '');

    try {
      // 1. Insert into events table
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .insert({
          title: formTitle.trim(),
          description: formDescription.trim(),
          event_date: formDate,
          location: formLocation.trim() || 'Private Venue',
          cover_url: formCoverUrl,
          status: 'active',
          total_photos: 0,
        })
        .select()
        .single();

      if (eventErr) throw eventErr;

      // 2. Insert event code into event_codes table
      if (eventData) {
        await supabase.from('event_codes').insert({
          event_id: eventData.id,
          code: newCode,
          status: 'active',
          max_uses: 1000,
        });

        const newEventItem: EventItem = {
          id: eventData.id,
          title: eventData.title,
          description: eventData.description,
          event_date: eventData.event_date || 'Upcoming',
          location: eventData.location || 'Private Venue',
          event_code: newCode,
          status: 'published',
          cover_image_url: eventData.cover_url,
          total_photos: 0,
          faces_indexed: 0,
          attendees_enrolled: 0,
          assigned_admins: [{ name: 'Studio Superadmin', initials: 'SA' }],
        };

        setEvents((prev) => [newEventItem, ...prev]);
      }
    } catch (err: any) {
      console.error('Failed to create event in Supabase:', err);
      alert('Error creating event: ' + (err.message || 'Please check database permissions.'));
    } finally {
      setIsSubmitting(false);
      setIsCreateModalOpen(false);
      setFormTitle('');
      setFormDescription('');
      setFormLocation('');
      setFormCode('');
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.event_code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || evt.status.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

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
          label: 'Processing',
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
    <AdminLayout breadcrumbs={['Console', 'Events']}>
      {/* Top Stat Highlights Bento Row (4 Cards) */}
      <View style={styles.topBentoGrid}>
        <View style={styles.bentoCard}>
          <View>
            <Text style={styles.bentoLabel}>TOTAL ACTIVE EVENTS</Text>
            <Text style={styles.bentoValue}>{events.length}</Text>
            <View style={styles.bentoGrowthRow}>
              <AdminIcon name="trending_up" size={14} color="#047857" />
              <Text style={styles.bentoGrowthText}>+3 this month</Text>
            </View>
          </View>
          <View style={styles.bentoIconBox}>
            <AdminIcon name="event_available" size={24} color={AdminColors.primary} />
          </View>
        </View>

        <View style={styles.bentoCard}>
          <View>
            <Text style={styles.bentoLabel}>INGESTED IMAGERY</Text>
            <Text style={styles.bentoValue}>
              {events
                .reduce((acc, curr) => acc + (curr.total_photos || 0), 0)
                .toLocaleString()}
            </Text>
            <Text style={styles.bentoSubCode}>Cloudflare R2 Storage</Text>
          </View>
          <View style={styles.bentoIconBox}>
            <AdminIcon name="photo_library" size={24} color={AdminColors.primary} />
          </View>
        </View>

        <View style={styles.bentoCard}>
          <View>
            <Text style={styles.bentoLabel}>INDEXED FACES</Text>
            <Text style={styles.bentoValue}>
              {events
                .reduce((acc, curr) => acc + (curr.faces_indexed || 0), 0)
                .toLocaleString()}
            </Text>
            <View style={styles.bentoGrowthRow}>
              <AdminIcon name="face" size={14} color={AdminColors.primary} />
              <Text style={[styles.bentoGrowthText, { color: AdminColors.primary }]}>
                99.4% Match Conf.
              </Text>
            </View>
          </View>
          <View style={styles.bentoIconBox}>
            <AdminIcon name="fitbit_hourly_activity" size={24} color={AdminColors.primary} />
          </View>
        </View>

        <View style={styles.bentoCard}>
          <View>
            <Text style={styles.bentoLabel}>ATTENDEE DELIVERIES</Text>
            <Text style={styles.bentoValue}>95.2%</Text>
            <View style={styles.bentoGrowthRow}>
              <AdminIcon name="done_all" size={14} color="#047857" />
              <Text style={styles.bentoGrowthText}>3,840 Enrolled</Text>
            </View>
          </View>
          <View style={styles.bentoIconBox}>
            <AdminIcon name="mark_email_read" size={24} color={AdminColors.primary} />
          </View>
        </View>
      </View>

      {/* Main Header Row */}
      <View style={styles.viewportHeader}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.viewportTitle}>Events</Text>
            <View style={styles.registeredPill}>
              <Text style={styles.registeredPillText}>
                {events.length} Registered
              </Text>
            </View>
          </View>
          <Text style={styles.viewportSubtitle}>
            Create and manage your event photo galleries, admin assignments, and
            attendee delivery rules.
          </Text>
        </View>

        <View style={styles.viewportActionButtons}>
          <TouchableOpacity style={styles.exportCsvBtn}>
            <AdminIcon name="file_download" size={17} color={AdminColors.secondary} />
            <Text style={styles.exportCsvBtnText}>Export CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createEventBtn}
            onPress={() => setIsCreateModalOpen(true)}
          >
            <AdminIcon name="add" size={18} color="#ffffff" />
            <Text style={styles.createEventBtnText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters & Operational Toolbar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchAndFiltersLeft}>
          {/* Search Box */}
          <View style={styles.filterSearchBox}>
            <AdminIcon
              name="search"
              size={17}
              color={AdminColors.outline}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.filterSearchInput}
              placeholder="Search events by name, location, code..."
              placeholderTextColor={AdminColors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Status Filter buttons */}
          <View style={styles.statusFiltersRow}>
            {['all', 'published', 'processing', 'draft'].map((st) => (
              <TouchableOpacity
                key={st}
                style={[
                  styles.statusFilterTab,
                  statusFilter === st && styles.statusFilterTabActive,
                ]}
                onPress={() => setStatusFilter(st)}
              >
                <Text
                  style={[
                    styles.statusFilterTabText,
                    statusFilter === st && styles.statusFilterTabTextActive,
                  ]}
                >
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* View Switcher Table vs Grid */}
        <View style={styles.viewSwitcherGroup}>
          <TouchableOpacity
            style={[
              styles.viewSwitchBtn,
              viewMode === 'table' && styles.viewSwitchBtnActive,
            ]}
            onPress={() => setViewMode('table')}
          >
            <AdminIcon
              name="table_rows"
              size={18}
              color={
                viewMode === 'table' ? AdminColors.primary : AdminColors.secondary
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewSwitchBtn,
              viewMode === 'grid' && styles.viewSwitchBtnActive,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <AdminIcon
              name="grid_view"
              size={18}
              color={
                viewMode === 'grid' ? AdminColors.primary : AdminColors.secondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Table or Grid View */}
      {viewMode === 'table' ? (
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.thText, { flex: 2.5 }]}>EVENT</Text>
            <Text style={[styles.thText, { width: 140 }]}>DATE</Text>
            <Text style={[styles.thText, { width: 130 }]}>PHOTOS & STORAGE</Text>
            <Text style={[styles.thText, { width: 130 }]}>FACES INDEXED</Text>
            <Text style={[styles.thText, { width: 130 }]}>ATTENDEES</Text>
            <Text style={[styles.thText, { width: 110 }]}>ADMINS</Text>
            <Text style={[styles.thText, { width: 110 }]}>STATUS</Text>
            <Text style={[styles.thText, { width: 140, textAlign: 'right' }]}>
              ACTIONS
            </Text>
          </View>

          {filteredEvents.map((evt) => {
            const stCfg = getStatusBadge(evt.status);
            const isSelected = selectedIds.includes(evt.id);

            return (
              <View key={evt.id} style={styles.tableRow}>
                {/* Event Name, Cover & Code */}
                <View style={[styles.tdCell, { flex: 2.5 }]}>
                  <Image
                    source={{ uri: evt.cover_image_url }}
                    style={styles.tableCover}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.eventRowTitle} numberOfLines={1}>
                      {evt.title}
                    </Text>
                    <View style={styles.eventRowMeta}>
                      <Text style={styles.eventRowLocation} numberOfLines={1}>
                        {evt.location}
                      </Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <View style={styles.codePill}>
                        <Text style={styles.codePillText}>{evt.event_code}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Date */}
                <View style={[styles.tdCell, { width: 140 }]}>
                  <View>
                    <Text style={styles.dateText}>{evt.event_date}</Text>
                    <Text style={styles.dateSubtext}>Live Active</Text>
                  </View>
                </View>

                {/* Photos & Storage */}
                <View style={[styles.tdCell, { width: 130 }]}>
                  <View>
                    <Text style={styles.numPhotosText}>
                      {(evt.total_photos || 0).toLocaleString()} photos
                    </Text>
                    <Text style={styles.storageSizeText}>
                      {((evt.total_photos || 0) * 0.0095).toFixed(1)} GB R2
                    </Text>
                  </View>
                </View>

                {/* Faces Indexed */}
                <View style={[styles.tdCell, { width: 130 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={styles.faceIconCircle}>
                      <AdminIcon name="face" size={14} color={AdminColors.primary} />
                    </View>
                    <View>
                      <Text style={styles.faceCountText}>
                        {(evt.faces_indexed || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.faceMatchPercent}>100% match</Text>
                    </View>
                  </View>
                </View>

                {/* Attendees */}
                <View style={[styles.tdCell, { width: 130 }]}>
                  <View style={{ width: '100%', paddingRight: 10 }}>
                    <Text style={styles.attendeesText}>
                      {evt.attendees_enrolled || 0} Enrolled
                    </Text>
                    <View style={styles.attendeeTrack}>
                      <View style={[styles.attendeeBar, { width: '88%' }]} />
                    </View>
                  </View>
                </View>

                {/* Assigned Admins */}
                <View style={[styles.tdCell, { width: 110 }]}>
                  <View style={styles.adminAvatarsStack}>
                    <View
                      style={[
                        styles.adminAvatarCircle,
                        { backgroundColor: AdminColors.gold },
                      ]}
                    >
                      <Text style={styles.adminAvatarInitials}>DK</Text>
                    </View>
                    <View
                      style={[
                        styles.adminAvatarCircle,
                        { backgroundColor: AdminColors.primary, marginLeft: -8 },
                      ]}
                    >
                      <Text style={styles.adminAvatarInitials}>SC</Text>
                    </View>
                  </View>
                </View>

                {/* Status */}
                <View style={[styles.tdCell, { width: 110 }]}>
                  <View
                    style={[styles.statusPill, { backgroundColor: stCfg.bg }]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: stCfg.dot }]}
                    />
                    <Text style={[styles.statusPillText, { color: stCfg.text }]}>
                      {stCfg.label}
                    </Text>
                  </View>
                </View>

                {/* Actions */}
                <View
                  style={[
                    styles.tdCell,
                    { width: 140, justifyContent: 'flex-end', gap: 6 },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => router.push('/admin/uploads' as any)}
                  >
                    <AdminIcon
                      name="cloud_upload"
                      size={16}
                      color={AdminColors.secondary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inspectBtn}
                    onPress={() => router.push('/admin/uploads' as any)}
                  >
                    <Text style={styles.inspectBtnText}>Inspect</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        /* Grid View */
        <View style={styles.gridContainer}>
          {filteredEvents.map((evt) => {
            const stCfg = getStatusBadge(evt.status);
            return (
              <View key={evt.id} style={styles.gridCard}>
                <Image
                  source={{ uri: evt.cover_image_url }}
                  style={styles.gridCardImage}
                />
                <View style={styles.gridCardBody}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={styles.codePill}>
                      <Text style={styles.codePillText}>{evt.event_code}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: stCfg.bg },
                      ]}
                    >
                      <Text style={[styles.statusPillText, { color: stCfg.text }]}>
                        {stCfg.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.gridCardTitle}>{evt.title}</Text>
                  <Text style={styles.gridCardLocation}>{evt.location}</Text>

                  <View style={styles.gridCardStatsRow}>
                    <View>
                      <Text style={styles.gridStatNumber}>
                        {(evt.total_photos || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.gridStatLabel}>Photos</Text>
                    </View>
                    <View>
                      <Text style={styles.gridStatNumber}>
                        {evt.faces_indexed || 0}
                      </Text>
                      <Text style={styles.gridStatLabel}>Faces</Text>
                    </View>
                    <View>
                      <Text style={styles.gridStatNumber}>
                        {evt.attendees_enrolled || 0}
                      </Text>
                      <Text style={styles.gridStatLabel}>Attendees</Text>
                    </View>
                  </View>

                  <View style={styles.gridCardActions}>
                    <TouchableOpacity
                      style={styles.gridUploadBtn}
                      onPress={() => router.push('/admin/uploads' as any)}
                    >
                      <AdminIcon name="cloud_upload" size={16} color="#ffffff" />
                      <Text style={styles.gridUploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Create Event Modal */}
      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create New Event</Text>
                <Text style={styles.modalSubtitle}>
                  Set up an archival gallery and configure event access codes
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <AdminIcon name="close" size={20} color={AdminColors.secondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Form */}
            <ScrollView style={styles.modalFormBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Royal Jaipur Palace Wedding"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Event Code (Short Code) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. JAIPUR-25"
                  autoCapitalize="characters"
                  value={formCode}
                  onChangeText={setFormCode}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Event Date *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="YYYY-MM-DD"
                    value={formDate}
                    onChangeText={setFormDate}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Location</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Rambagh Palace, Jaipur"
                    value={formLocation}
                    onChangeText={setFormLocation}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Production notes, schedule, or photography brief..."
                  multiline
                  value={formDescription}
                  onChangeText={setFormDescription}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cover Image URL</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://..."
                  value={formCoverUrl}
                  onChangeText={setFormCoverUrl}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreateModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleCreateEvent}
                disabled={isSubmitting || !formTitle.trim()}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AdminIcon name="check" size={18} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Create Event</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  topBentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  bentoCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  bentoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.8,
  },
  bentoValue: {
    fontSize: 24,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 4,
  },
  bentoGrowthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  bentoGrowthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  bentoSubCode: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
    marginTop: 4,
  },
  bentoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Viewport Header
  viewportHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 20,
  },
  viewportTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: AdminColors.onSurface,
    letterSpacing: -0.5,
  },
  registeredPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainer,
  },
  registeredPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  viewportSubtitle: {
    fontSize: 13.5,
    color: AdminColors.secondary,
    marginTop: 4,
    maxWidth: 600,
  },
  viewportActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  exportCsvBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  exportCsvBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  createEventBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: AdminColors.primaryContainer,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  createEventBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Toolbar
  toolbarCard: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  searchAndFiltersLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterSearchBox: {
    width: 280,
    height: 36,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  filterSearchInput: {
    flex: 1,
    height: 34,
    fontSize: 12.5,
    color: AdminColors.onSurface,
    outlineWidth: 0 as any,
  },
  statusFiltersRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statusFilterTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusFilterTabActive: {
    backgroundColor: AdminColors.surfaceContainer,
  },
  statusFilterTabText: {
    fontSize: 12,
    color: AdminColors.secondary,
    fontWeight: '500',
  },
  statusFilterTabTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
  },
  viewSwitcherGroup: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 2,
    borderRadius: 8,
  },
  viewSwitchBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitchBtnActive: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  // Table
  tableCard: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.2)',
  },
  tdCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableCover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: AdminColors.surfaceVariant,
  },
  eventRowTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  eventRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  eventRowLocation: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  dotSeparator: {
    color: AdminColors.outline,
    fontSize: 11,
  },
  codePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: AdminColors.surfaceContainer,
  },
  codePillText: {
    fontSize: 10,
    fontFamily: AdminTypography.fontFamily.mono,
    fontWeight: '600',
    color: AdminColors.onSurfaceVariant,
  },
  dateText: {
    fontSize: 12.5,
    color: AdminColors.onSurface,
  },
  dateSubtext: {
    fontSize: 10.5,
    color: AdminColors.secondary,
    marginTop: 1,
  },
  numPhotosText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  storageSizeText: {
    fontSize: 10.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  faceIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: AdminColors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceCountText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  faceMatchPercent: {
    fontSize: 10.5,
    color: '#059669',
  },
  attendeesText: {
    fontSize: 11.5,
    color: AdminColors.onSurface,
    marginBottom: 4,
  },
  attendeeTrack: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: AdminColors.surfaceContainer,
    overflow: 'hidden',
  },
  attendeeBar: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: AdminColors.primary,
  },
  adminAvatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminAvatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  adminAvatarInitials: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  inspectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: AdminColors.primary,
  },
  inspectBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  gridCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 380,
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  gridCardImage: {
    width: '100%',
    height: 150,
    backgroundColor: AdminColors.surfaceVariant,
  },
  gridCardBody: {
    padding: 16,
    gap: 10,
  },
  gridCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  gridCardLocation: {
    fontSize: 12,
    color: AdminColors.secondary,
  },
  gridCardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 10,
    borderRadius: 8,
  },
  gridStatNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  gridStatLabel: {
    fontSize: 10.5,
    color: AdminColors.secondary,
  },
  gridCardActions: {
    marginTop: 4,
  },
  gridUploadBtn: {
    backgroundColor: AdminColors.primary,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  gridUploadBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 27, 43, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.25)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  modalSubtitle: {
    fontSize: 12,
    color: AdminColors.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFormBody: {
    padding: 20,
    maxHeight: 440,
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.onSurface,
    marginBottom: 6,
  },
  formInput: {
    height: 40,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    paddingHorizontal: 12,
    fontSize: 13,
    color: AdminColors.onSurface,
    outlineWidth: 0 as any,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.25)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

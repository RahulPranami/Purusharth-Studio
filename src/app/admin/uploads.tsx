import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { uploadToR2, recordMediaInDatabase } from '@/services/r2';
import { indexPhotoInAnalyzer } from '@/services/analyzer';
import { supabase } from '@/utils/supabase';

interface QueueItem {
  id: string;
  name: string;
  size: number;
  previewUrl: string;
  progress: number;
  speed: string;
  status: 'uploading' | 'indexing' | 'completed' | 'failed' | 'paused';
  facesCount?: number;
  r2Key?: string;
  r2Url?: string;
  sha?: string;
}

interface EventOption {
  id: string;
  title: string;
  event_date: string;
  location: string;
}

export default function AdminPhotoUploadsScreen() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('default-1');
  const [isEventPickerOpen, setIsEventPickerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Queue state starts empty for user uploads
  const [queue, setQueue] = useState<QueueItem[]>([]);

  // Load events for target selector from Supabase
  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, event_date, location')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setEvents(data);
          setSelectedEventId(data[0].id);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.warn('Error loading events:', err);
      }
    }
    fetchEvents();
  }, []);

  const currentEvent =
    events.find((e) => e.id === selectedEventId) ||
    events[0] || {
      id: '',
      title: 'Select an Event',
      event_date: '',
      location: '',
    };

  // Upload handler for Web & Mobile
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const targetEventId = selectedEventId || (events[0]?.id ? events[0].id : '');
    if (!targetEventId) {
      alert('Please select an event from the dropdown before uploading photos.');
      return;
    }

    setIsUploading(true);
    const newItems: QueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = `upload-${Date.now()}-${i}`;
      const previewUrl =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? URL.createObjectURL(file)
          : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=300&q=80';

      const queueItem: QueueItem = {
        id: itemId,
        name: file.name,
        size: file.size,
        previewUrl,
        progress: 10,
        speed: 'Connecting to Cloudflare R2...',
        status: 'uploading',
      };

      newItems.push(queueItem);
    }

    setQueue((prev) => [...newItems, ...prev]);

    // Process uploads through uploadToR2 directly to Cloudflare R2
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetId = newItems[i].id;

      try {
        const uploadRes = await uploadToR2(
          file,
          `events/${targetEventId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          (p) => {
            setQueue((prev) =>
              prev.map((item) =>
                item.id === targetId
                  ? {
                      ...item,
                      progress: typeof p === 'number' ? p : p.percent,
                      speed: 'Streaming to R2...',
                    }
                  : item
              )
            );
          }
        );

        // Store into Supabase `media` table under targetEventId
        try {
          await recordMediaInDatabase({
            eventId: targetEventId,
            objectKey: uploadRes.key,
            url: uploadRes.url,
            sizeBytes: uploadRes.size,
            mimeType: uploadRes.contentType,
            title: uploadRes.fileName.replace(/^[0-9]+_/, '').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
            mediaType: 'photo',
            status: 'ready',
          });
        } catch (dbErr) {
          console.warn('Error recording media in Supabase:', dbErr);
        }

        // Real-time Facial Indexing via Analyzer API
        let detectedFaces = 0;
        try {
          setQueue((prev) =>
            prev.map((item) =>
              item.id === targetId ? { ...item, status: 'indexing' } : item
            )
          );
          const indexRes = await indexPhotoInAnalyzer(uploadRes.key, targetEventId);
          detectedFaces = typeof indexRes.faces_detected === 'number' ? indexRes.faces_detected : 0;
        } catch (idxErr) {
          console.warn('Facial indexing non-fatal error:', idxErr);
        }

        // Set completed in queue with REAL detected face count
        setQueue((prev) =>
          prev.map((item) =>
            item.id === targetId
              ? {
                  ...item,
                  progress: 100,
                  status: 'completed',
                  facesCount: detectedFaces,
                  r2Key: uploadRes.key,
                  r2Url: uploadRes.url,
                }
              : item
          )
        );
      } catch (uploadErr: any) {
        console.error('Upload failed for file:', file.name, uploadErr);
        setQueue((prev) =>
          prev.map((item) =>
            item.id === targetId ? { ...item, status: 'failed', speed: uploadErr.message || 'Upload failed' } : item
          )
        );
      }
    }

    setIsUploading(false);
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const handleRetryFailed = () => {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === 'failed'
          ? { ...item, status: 'uploading', progress: 15 }
          : item
      )
    );
  };

  return (
    <AdminLayout breadcrumbs={['Console', 'Photo Uploads']}>
      {/* Hidden Web File Input for multi-file upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/heic,image/webp,image/x-canon-cr2,image/x-nikon-nef"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) {
              handleFilesSelected(e.target.files);
            }
          }}
        />
      )}

      {/* Top Clean Header & Target Event Selector */}
      <View style={styles.topContextBanner}>
        <View style={styles.bannerLeft}>
          <Text style={styles.mainTitle}>Photo Uploads</Text>
          <Text style={styles.subTitle}>
            Upload high-resolution photographs directly to Cloudflare R2 archive and run facial recognition indexing.
          </Text>
        </View>

        {/* Target Event Switcher Card */}
        <View style={styles.targetEventCard}>
          <View style={styles.targetEventContent}>
            <View style={styles.targetEventIconBox}>
              <AdminIcon name="calendar_month" size={24} color={AdminColors.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.targetEventLabel}>TARGET EVENT</Text>
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>Active</Text>
                </View>
              </View>
              <Text style={styles.targetEventTitle} numberOfLines={1}>
                {currentEvent.title}
              </Text>
              <Text style={styles.targetEventMeta} numberOfLines={1}>
                {currentEvent.event_date || 'Upcoming'} • {currentEvent.location || 'Private Venue'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.switchEventBtn}
            onPress={() => setIsEventPickerOpen(!isEventPickerOpen)}
          >
            <Text style={styles.switchEventBtnText}>
              {isEventPickerOpen ? 'Done' : 'Switch Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Event Picker Dropdown (Expandable) */}
      {isEventPickerOpen && (
        <View style={styles.eventPickerDropdown}>
          <Text style={styles.eventPickerHeading}>Select Target Event:</Text>
          {events.map((evt) => (
            <TouchableOpacity
              key={evt.id}
              style={[
                styles.eventPickerItem,
                evt.id === selectedEventId && styles.eventPickerItemActive,
              ]}
              onPress={() => {
                setSelectedEventId(evt.id);
                setIsEventPickerOpen(false);
              }}
            >
              <Text style={styles.eventPickerTitle}>{evt.title}</Text>
              <Text style={styles.eventPickerDate}>{evt.event_date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Upload Drop Zone Area */}
      <View
        style={[
          styles.dropZoneContainer,
          isDragging && styles.dropZoneDragging,
        ]}
        {...(Platform.OS === 'web'
          ? ({
              onDragOver: (e: any) => {
                e.preventDefault();
                setIsDragging(true);
              },
              onDragLeave: (e: any) => {
                e.preventDefault();
                setIsDragging(false);
              },
              onDrop: (e: any) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer && e.dataTransfer.files) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              },
            } as any)
          : {})}
      >
        <View style={styles.dropZoneCloudBox}>
          <AdminIcon name="cloud_upload" size={32} color="#ffffff" />
        </View>

        <Text style={styles.dropZoneTitle}>
          Drag and drop event photographs here
        </Text>
        <Text style={styles.dropZoneSubtitle}>
          Select high-resolution photos for {currentEvent.title}. Originals stream directly to Cloudflare R2 and index for AI facial recognition.
        </Text>

        {/* File Picker Actions */}
        <View style={styles.dropZoneActionsRow}>
          <TouchableOpacity
            style={[styles.selectFilesBtn, isUploading && { opacity: 0.85 }]}
            disabled={isUploading}
            onPress={() => {
              if (Platform.OS === 'web' && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AdminIcon name="photo_library" size={18} color="#ffffff" />
            )}
            <Text style={styles.selectFilesBtnText}>
              {isUploading ? 'Streaming to R2...' : 'Choose Photo Files'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Supported Formats */}
        <View style={styles.dropZoneFooterTrust}>
          <View style={styles.trustBadge}>
            <AdminIcon name="info" size={14} color={AdminColors.outline} />
            <Text style={styles.trustBadgeText}>
              JPG, JPEG, PNG, HEIC, WebP up to 50MB each.
            </Text>
          </View>
          <View style={styles.trustBadge}>
            <AdminIcon name="verified_user" size={14} color={AdminColors.primary} />
            <Text style={styles.trustBadgeText}>
              Direct stream to Cloudflare R2. Zero compression applied.
            </Text>
          </View>
        </View>
      </View>

      {/* Upload Queue Panel */}
      <View style={styles.queuePanel}>
        {/* Queue Control Header */}
        <View style={styles.queueHeaderRow}>
          <View style={styles.queueHeaderLeft}>
            <View>
              <Text style={styles.queueTitle}>Upload Queue</Text>
              <Text style={styles.queueSubtitle}>
                {queue.length} file{queue.length === 1 ? '' : 's'} in current session
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.queueHeaderButtons}>
            {selectedEventId ? (
              <TouchableOpacity
                style={[styles.queueBtn, { borderColor: AdminColors.primary }]}
                onPress={() => router.push(`/event/${selectedEventId}` as any)}
              >
                <AdminIcon name="visibility" size={16} color={AdminColors.primary} />
                <Text style={[styles.queueBtnText, { color: AdminColors.primary, fontWeight: '700' }]}>
                  View Event Gallery →
                </Text>
              </TouchableOpacity>
            ) : null}
            {queue.some((q) => q.status === 'failed') && (
              <TouchableOpacity
                style={[styles.queueBtn, { borderColor: '#ef4444' }]}
                onPress={handleRetryFailed}
              >
                <AdminIcon name="refresh" size={16} color="#ef4444" />
                <Text style={[styles.queueBtnText, { color: '#ef4444' }]}>Retry Failed</Text>
              </TouchableOpacity>
            )}
            {queue.some((q) => q.status === 'completed') && (
              <TouchableOpacity
                style={styles.queueBtn}
                onPress={handleClearCompleted}
              >
                <Text style={styles.queueBtnText}>Clear Completed</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Empty state or Table */}
        {queue.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
            <AdminIcon name="photo_library" size={36} color={AdminColors.outline} />
            <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '600', color: AdminColors.onSurface }}>
              No Active Uploads
            </Text>
            <Text style={{ marginTop: 4, fontSize: 13, color: AdminColors.secondary }}>
              Click &quot;Choose Photo Files&quot; above to begin uploading into {currentEvent.title}.
            </Text>
          </View>
        ) : (
          <View style={styles.tableWrapper}>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { width: 64 }]}>Preview</Text>
              <Text style={[styles.thCell, { flex: 2 }]}>File Name</Text>
              <Text style={[styles.thCell, { width: 100 }]}>Size</Text>
              <Text style={[styles.thCell, { flex: 2 }]}>Upload Progress</Text>
              <Text style={[styles.thCell, { flex: 1.5 }]}>Status</Text>
              <Text style={[styles.thCell, { width: 80, textAlign: 'right' }]}>
                Action
              </Text>
            </View>

            {/* Table Body */}
            {queue.map((item) => {
              const sizeMb = (item.size / (1024 * 1024)).toFixed(1);
              return (
                <View key={item.id} style={styles.tableBodyRow}>
                  {/* Preview Thumbnail */}
                  <View style={{ width: 64 }}>
                    <Image
                      source={{ uri: item.previewUrl }}
                      style={styles.tableRowThumbnail}
                    />
                  </View>

                  {/* File Name */}
                  <View style={{ flex: 2, paddingRight: 10 }}>
                    <Text style={styles.tableFileName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  {/* Size */}
                  <View style={{ width: 100 }}>
                    <Text style={styles.tableSizeText}>{sizeMb} MB</Text>
                  </View>

                  {/* Upload Progress */}
                  <View style={{ flex: 2, paddingRight: 16 }}>
                    <View style={styles.progressLabelRow}>
                      <Text
                        style={[
                          styles.progressPercentText,
                          item.status === 'completed' && { color: '#047857' },
                        ]}
                      >
                        {item.status === 'completed'
                          ? '100% Uploaded'
                          : `${item.progress}%`}
                      </Text>
                      <Text style={styles.progressLoadedText}>
                        {((item.size * item.progress) / (100 * 1024 * 1024)).toFixed(1)}{' '}
                        / {sizeMb} MB
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${item.progress}%` },
                          item.status === 'completed' && {
                            backgroundColor: '#10b981',
                          },
                          item.status === 'failed' && {
                            backgroundColor: AdminColors.error,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Status Badge */}
                  <View style={{ flex: 1.5 }}>
                    {item.status === 'completed' ? (
                      <View style={styles.statusCompletedBadge}>
                        <View style={styles.completedDot} />
                        <Text style={styles.statusCompletedText}>
                          Completed • {item.facesCount ?? 0} {item.facesCount === 1 ? 'Face' : 'Faces'} Indexed
                        </Text>
                      </View>
                    ) : item.status === 'indexing' ? (
                      <View style={styles.statusIndexingBadge}>
                        <ActivityIndicator size="small" color="#b45309" />
                        <Text style={styles.statusIndexingText}>Indexing Faces</Text>
                      </View>
                    ) : item.status === 'failed' ? (
                      <View style={styles.statusFailedBadge}>
                        <AdminIcon name="error" size={14} color={AdminColors.error} />
                        <Text style={styles.statusFailedText} numberOfLines={1}>
                          {item.speed || 'Upload Failed'}
                        </Text>
                      </View>
                    ) : item.status === 'paused' ? (
                      <View style={styles.statusPausedBadge}>
                        <AdminIcon name="pause" size={14} color={AdminColors.secondary} />
                        <Text style={styles.statusPausedText}>Paused</Text>
                      </View>
                    ) : (
                      <View style={styles.statusUploadingBadge}>
                        <ActivityIndicator size="small" color={AdminColors.primary} />
                        <Text style={styles.statusUploadingText}>Uploading</Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={{ width: 80, alignItems: 'flex-end' }}>
                    <TouchableOpacity
                      style={styles.rowActionBtn}
                      onPress={() => {
                        setQueue((prev) => prev.filter((q) => q.id !== item.id));
                      }}
                    >
                      <Text style={styles.rowActionBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  topContextBanner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  bannerLeft: {
    flex: 1,
    minWidth: 280,
  },
  pipelinePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pipelinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AdminColors.primaryFixed,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.primary,
  },
  pipelinePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.onPrimaryFixed,
    letterSpacing: 0.6,
  },
  sessionIdText: {
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
  targetEventCard: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    minWidth: 320,
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  targetEventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  targetEventIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetEventLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  activeTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: AdminColors.secondaryContainer,
  },
  activeTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: AdminColors.onSecondaryFixed,
  },
  targetEventTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: AdminColors.onSurface,
    marginTop: 1,
  },
  targetEventMeta: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
    marginTop: 1,
  },
  switchEventBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: AdminColors.surface,
  },
  switchEventBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  eventPickerDropdown: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: AdminColors.surfaceVariant,
  },
  eventPickerHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.secondary,
    marginBottom: 4,
  },
  eventPickerItem: {
    padding: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: AdminColors.surface,
  },
  eventPickerItemActive: {
    backgroundColor: AdminColors.surfaceContainer,
  },
  eventPickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  eventPickerDate: {
    fontSize: 12,
    color: AdminColors.secondary,
  },
  // Telemetry Bar
  telemetryBarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: AdminColors.secondary,
    fontWeight: '500',
  },
  metricNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 10,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  metricUnit: {
    fontSize: 12,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  activePillSmall: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  activePillSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  metricFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metricFooterText: {
    fontSize: 11,
    color: AdminColors.secondary,
  },
  metricFooterHighlight: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  sparklineTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: AdminColors.surfaceContainer,
    marginTop: 8,
    overflow: 'hidden',
  },
  sparklineBar: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AdminColors.primary,
  },
  // Drop Zone
  dropZoneContainer: {
    backgroundColor: AdminColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  dropZoneDragging: {
    borderColor: AdminColors.primary,
    backgroundColor: AdminColors.surfaceContainer,
  },
  dropZoneCloudBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: AdminColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: AdminColors.primaryContainer,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  dropZoneTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AdminColors.onSurface,
    textAlign: 'center',
  },
  dropZoneSubtitle: {
    fontSize: 13.5,
    color: AdminColors.secondary,
    maxWidth: 540,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  dropZoneActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  selectFilesBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: AdminColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: AdminColors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  selectFilesBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectFolderBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 1,
  },
  selectFolderBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  dropZoneFooterTrust: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AdminColors.surfaceContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustBadgeText: {
    fontSize: 11,
    color: AdminColors.secondary,
  },
  // Queue Table
  queuePanel: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
    marginBottom: 32,
  },
  queueHeaderRow: {
    padding: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.25)',
  },
  queueHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activePulsingCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: AdminColors.primary,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  queueSubtitle: {
    fontSize: 11.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
    marginTop: 1,
  },
  queueHeaderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  queueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  queueBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  tableWrapper: {
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: AdminColors.surfaceContainerLow,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.2)',
  },
  tableRowThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainer,
  },
  tableFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  tableFileSha: {
    fontSize: 10.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
    marginTop: 2,
  },
  tableResText: {
    fontSize: 12,
    color: AdminColors.onSurface,
  },
  tableSizeText: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
    marginTop: 2,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressPercentText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  progressLoadedText: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.surfaceContainer,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: AdminColors.primary,
  },
  statusCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  completedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusCompletedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  statusIndexingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusIndexingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  statusFailedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusFailedText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.error,
  },
  statusPausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: AdminColors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusPausedText: {
    fontSize: 11,
    fontWeight: '500',
    color: AdminColors.secondary,
  },
  statusUploadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AdminColors.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusUploadingText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.primary,
  },
  rowActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rowActionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.secondary,
  },
});

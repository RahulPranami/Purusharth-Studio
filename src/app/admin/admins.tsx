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
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminIcon } from '@/components/admin/AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { supabase } from '@/utils/supabase';

interface AdminMember {
  id: string;
  name: string;
  email: string;
  role: string;
  specialty: string;
  avatarUrl: string;
  assignedEvents: string[];
  status: 'active' | 'pending' | 'suspended';
  dateAdded: string;
  lastActive: string;
}

interface AdminInviteRecord {
  id: string;
  code: string;
  email?: string;
  role: string;
  assigned_events: string[];
  max_uses: number;
  uses_count: number;
  status: string;
  expires_at?: string;
}

export default function AdminDirectoryScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [adminsList, setAdminsList] = useState<AdminMember[]>([
    {
      id: '804',
      name: 'Devansh Kapoor',
      email: 'devansh.k@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Lead Colorist',
      avatarUrl:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      assignedEvents: [
        'The Royal Udaipur Wedding',
        'Oberoi Heritage Gala 2024',
      ],
      status: 'active',
      dateAdded: 'May 10, 2025',
      lastActive: '12 mins ago',
    },
    {
      id: '809',
      name: 'Sarah Chen',
      email: 'sarah.c@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Lead Shooter',
      avatarUrl:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
      assignedEvents: ['Annual Tech Summit 2025', 'AI Innovators Gala'],
      status: 'active',
      dateAdded: 'Apr 22, 2025',
      lastActive: '45 mins ago',
    },
    {
      id: '812',
      name: 'Marcus Kane',
      email: 'marcus.k@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Contract Staff',
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      assignedEvents: ['Annual Tech Summit 2025'],
      status: 'active',
      dateAdded: 'May 04, 2025',
      lastActive: '2 hours ago',
    },
    {
      id: '815',
      name: 'Priya Nambiar',
      email: 'priya.n@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Field Director',
      avatarUrl:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      assignedEvents: ['Mehta & Singhal Sangeet Soirée'],
      status: 'active',
      dateAdded: 'May 12, 2025',
      lastActive: 'Yesterday',
    },
    {
      id: '820',
      name: 'Kabir Rao',
      email: 'kabir.r@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Senior DIT',
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      assignedEvents: ['Oberoi Heritage Gala 2024'],
      status: 'pending',
      dateAdded: 'May 20, 2025',
      lastActive: 'Awaiting Acceptance',
    },
    {
      id: '825',
      name: 'Elena Rostova',
      email: 'elena.r@purusharthstudio.com',
      role: 'Event Admin',
      specialty: 'Ops Director',
      avatarUrl:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      assignedEvents: ['Global FinTech Expo 2025'],
      status: 'active',
      dateAdded: 'Apr 18, 2025',
      lastActive: '3 hours ago',
    },
  ]);

  const [invites, setInvites] = useState<AdminInviteRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal / Drawer state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEvents, setInviteEvents] = useState('The Royal Udaipur Wedding');
  const [inviteCode, setInviteCode] = useState('PS-ADMIN-9482');
  const [inviteMaxUses, setInviteMaxUses] = useState('5');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Fetch real admin invites from Supabase
        const { data: inviteData } = await supabase
          .from('admin_invites')
          .select('*')
          .order('created_at', { ascending: false });

        if (inviteData && inviteData.length > 0) {
          setInvites(inviteData);
          if (inviteData[0].code) {
            setInviteCode(inviteData[0].code);
          }
        }

        // 2. Fetch real admin members from Supabase profiles
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('role', ['admin', 'super_admin'])
          .order('created_at', { ascending: false });

        if (adminProfiles && adminProfiles.length > 0) {
          const mapped: AdminMember[] = adminProfiles.map((p: any) => ({
            id: p.id,
            name: p.display_name || p.email?.split('@')[0] || 'Studio Admin',
            email: p.email || 'admin@purusharthstudio.com',
            role: p.role === 'super_admin' ? 'Super Admin' : 'Event Admin',
            specialty: p.role === 'super_admin' ? 'Studio Director' : 'Lead Photographer',
            avatarUrl:
              p.avatar_url ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            assignedEvents: ['All Studio Productions'],
            status: (p.status as any) || 'active',
            dateAdded: 'Permanent Roster',
            lastActive: 'Online Now',
          }));
          setAdminsList(mapped);
        }
      } catch (err) {
        console.warn('Error loading admins/invites:', err);
      }
    }
    loadData();
  }, []);

  const generateNewCode = () => {
    const randomHex = Math.floor(Math.random() * 9000 + 1000);
    const code = `INVITE-${randomHex}`;
    setInviteCode(code);
  };

  const handleSendInvite = async () => {
    setIsInviting(true);

    const payload = {
      code: inviteCode.trim().toUpperCase(),
      max_uses: parseInt(inviteMaxUses, 10) || 5,
      use_count: 0,
      status: 'active',
      expires_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };

    try {
      const { error } = await supabase.from('admin_invites').insert(payload);
      if (error) throw error;

      // Add to invites list
      setInvites((prev: any) => [{ ...payload, id: `inv-${Date.now()}` }, ...prev]);
    } catch (err: any) {
      console.warn('Failed to insert admin invite:', err);
      alert('Error creating invite: ' + (err.message || 'Check database permissions.'));
    } finally {
      setIsInviting(false);
      setIsInviteModalOpen(false);
    }
  };

  const copyInviteLink = () => {
    const url = `https://purusharth.studio/join?token=${inviteCode}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredAdmins = adminsList.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.specialty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout breadcrumbs={['Console', 'Admins']}>
      {/* Top Banner */}
      <View style={styles.topContextBanner}>
        <View style={styles.bannerLeft}>
          <View style={styles.tagRow}>
            <View style={styles.rbacPill}>
              <Text style={styles.rbacPillText}>RBAC ENGINE V2.4</Text>
            </View>
            <View style={styles.policySyncedPill}>
              <View style={styles.syncedDot} />
              <Text style={styles.policySyncedText}>Policy Synced</Text>
            </View>
          </View>
          <Text style={styles.mainTitle}>Admins</Text>
          <Text style={styles.subTitle}>
            Manage team members, staff photographers, and granular event-level
            permissions.
          </Text>
        </View>

        <View style={styles.bannerRightActions}>
          <TouchableOpacity style={styles.auditCsvBtn}>
            <AdminIcon name="download" size={17} color={AdminColors.secondary} />
            <Text style={styles.auditCsvBtnText}>Export Audit CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createInviteBtn}
            onPress={() => setIsInviteModalOpen(true)}
          >
            <AdminIcon name="person_add" size={18} color="#ffffff" />
            <Text style={styles.createInviteBtnText}>
              + Create Admin Invitation
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* KPI Summary Bento Cards (3 Cards) */}
      <View style={styles.kpiGrid}>
        {/* Card 1 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>ACTIVE CREDENTIALS</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>18</Text>
                <Text style={styles.kpiUnit}>admins</Text>
              </View>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="verified_user" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <View style={styles.greenPill}>
              <Text style={styles.greenPillText}>12 Events Covered</Text>
            </View>
            <Text style={styles.kpiSubMetric}>100% quorum</Text>
          </View>
        </View>

        {/* Card 2 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>PENDING ONBOARDING</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>3</Text>
                <Text style={styles.kpiUnit}>invitations</Text>
              </View>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="hourglass_top" size={22} color={AdminColors.secondary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <View style={styles.amberPill}>
              <Text style={styles.amberPillText}>Awaiting Acceptance</Text>
            </View>
            <Text style={styles.kpiSubMetric}>Avg TTL: 38h</Text>
          </View>
        </View>

        {/* Card 3 */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiTop}>
            <View>
              <Text style={styles.kpiLabel}>SCOPE ISOLATION</Text>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>18</Text>
                <Text style={styles.kpiUnit}>Event Admins</Text>
              </View>
            </View>
            <View style={styles.kpiIconBox}>
              <AdminIcon name="shield_lock" size={22} color={AdminColors.primary} />
            </View>
          </View>
          <View style={styles.kpiBottom}>
            <Text style={styles.kpiIsolationNotice}>
              Superadmin privileges restricted to Studio Owner
            </Text>
          </View>
        </View>
      </View>

      {/* Active Invite Key Showcase Box */}
      <View style={styles.activeKeyBox}>
        <View style={styles.activeKeyLeft}>
          <Text style={styles.activeKeyLabel}>ACTIVE INVITE KEY</Text>
          <Text style={styles.activeKeyCode}>{inviteCode}</Text>
          <Text style={styles.activeKeyDescription}>
            Grants Level-2 Operator clearance: live proxy previews, raw DNG
            tagging, and high-speed upload bucket access.
          </Text>
        </View>

        <View style={styles.activeKeyRight}>
          <TouchableOpacity
            style={styles.copyKeyBtn}
            onPress={copyInviteLink}
          >
            <AdminIcon
              name={copiedLink ? 'check' : 'content_copy'}
              size={18}
              color={AdminColors.onSurface}
            />
            <Text style={styles.copyKeyBtnText}>
              {copiedLink ? 'Copied URL!' : 'Copy Link'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshKeyBtn}
            onPress={generateNewCode}
          >
            <AdminIcon name="refresh" size={15} color={AdminColors.secondary} />
            <Text style={styles.refreshKeyText}>Refresh Key</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter & Action Controls Bar */}
      <View style={styles.toolbarCard}>
        <View style={styles.searchBox}>
          <AdminIcon
            name="search"
            size={17}
            color={AdminColors.outline}
            style={{ marginRight: 6 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search admins by name, email, or token..."
            placeholderTextColor={AdminColors.outline}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.statusPillsRow}>
          {['all', 'active', 'pending', 'suspended'].map((st) => (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusFilterBtn,
                statusFilter === st && styles.statusFilterBtnActive,
              ]}
              onPress={() => setStatusFilter(st)}
            >
              <Text
                style={[
                  styles.statusFilterBtnText,
                  statusFilter === st && styles.statusFilterBtnTextActive,
                ]}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Admin Directory Data Table */}
      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.thText, { flex: 2.5 }]}>ADMIN & CLEARANCE</Text>
          <Text style={[styles.thText, { flex: 2 }]}>EMAIL ADDRESS</Text>
          <Text style={[styles.thText, { flex: 2.5 }]}>ASSIGNED EVENTS</Text>
          <Text style={[styles.thText, { width: 110 }]}>STATUS</Text>
          <Text style={[styles.thText, { width: 130 }]}>LAST ACTIVE</Text>
          <Text style={[styles.thText, { width: 100, textAlign: 'right' }]}>
            ACTIONS
          </Text>
        </View>

        {filteredAdmins.map((adm) => (
          <View key={adm.id} style={styles.tableRow}>
            {/* Avatar & Clearance */}
            <View style={[styles.tdCell, { flex: 2.5 }]}>
              <Image source={{ uri: adm.avatarUrl }} style={styles.adminAvatar} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.adminName} numberOfLines={1}>
                    {adm.name}
                  </Text>
                  <View style={styles.adminIdBadge}>
                    <Text style={styles.adminIdText}>ID: {adm.id}</Text>
                  </View>
                </View>
                <View style={styles.clearanceRow}>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>{adm.role}</Text>
                  </View>
                  <Text style={styles.specialtyText}>• {adm.specialty}</Text>
                </View>
              </View>
            </View>

            {/* Email */}
            <View style={[styles.tdCell, { flex: 2 }]}>
              <Text style={styles.emailText} numberOfLines={1}>
                {adm.email}
              </Text>
            </View>

            {/* Assigned Events */}
            <View style={[styles.tdCell, { flex: 2.5, flexWrap: 'wrap', gap: 4 }]}>
              {adm.assignedEvents.map((ev, i) => (
                <View key={i} style={styles.eventChip}>
                  <Text style={styles.eventChipText} numberOfLines={1}>
                    {ev}
                  </Text>
                </View>
              ))}
            </View>

            {/* Status */}
            <View style={[styles.tdCell, { width: 110 }]}>
              {adm.status === 'active' ? (
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>Active</Text>
                </View>
              ) : adm.status === 'pending' ? (
                <View style={styles.pendingPill}>
                  <View style={styles.pendingDot} />
                  <Text style={styles.pendingPillText}>Pending</Text>
                </View>
              ) : (
                <View style={styles.suspendedPill}>
                  <View style={styles.suspendedDot} />
                  <Text style={styles.suspendedPillText}>Suspended</Text>
                </View>
              )}
            </View>

            {/* Last Active */}
            <View style={[styles.tdCell, { width: 130 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AdminIcon name="schedule" size={13} color="#059669" />
                <Text style={styles.lastActiveText}>{adm.lastActive}</Text>
              </View>
            </View>

            {/* Actions */}
            <View
              style={[
                styles.tdCell,
                { width: 100, justifyContent: 'flex-end', gap: 6 },
              ]}
            >
              <TouchableOpacity style={styles.actionBtn}>
                <AdminIcon name="tune" size={16} color={AdminColors.secondary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <AdminIcon
                  name="person_remove"
                  size={16}
                  color={AdminColors.error}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Zero Trust Principle Banner */}
      <View style={styles.securityBanner}>
        <View style={styles.securityIconBox}>
          <AdminIcon
            name="admin_panel_settings"
            size={22}
            color={AdminColors.primary}
          />
        </View>
        <View style={{ flex: 1, minWidth: 260 }}>
          <Text style={styles.securityTitle}>Superadmin Zero-Trust Principle</Text>
          <Text style={styles.securityDesc}>
            Event Admins are strictly scoped to upload media, review facial
            matches, and download approved hi-res packages for their assigned
            events only. Global platform billing, AI embedding model
            re-indexing, and webhook configurations remain restricted to Studio
            Owner.
          </Text>
        </View>
      </View>

      {/* Create Admin Invite Modal */}
      <Modal
        visible={isInviteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsInviteModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalDialog}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <View style={styles.blueBullet} />
                  <Text style={styles.modalCategory}>SCOPED ACCESS GRANT</Text>
                </View>
                <Text style={styles.modalTitle}>Invite Event Admin</Text>
                <Text style={styles.modalSubtitle}>
                  Send an invitation link or passcode. Admins can only view and
                  manage events assigned to them.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsInviteModalOpen(false)}
                style={{ padding: 4 }}
              >
                <AdminIcon name="close" size={20} color={AdminColors.secondary} />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Admin Email Address *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="colleague@purusharthstudio.com"
                  keyboardType="email-address"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Assigned Event *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. The Royal Udaipur Wedding"
                  value={inviteEvents}
                  onChangeText={setInviteEvents}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Max Uses</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="5"
                    keyboardType="number-pad"
                    value={inviteMaxUses}
                    onChangeText={setInviteMaxUses}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Passcode Token</Text>
                  <View style={styles.tokenBox}>
                    <Text style={styles.tokenText}>{inviteCode}</Text>
                    <TouchableOpacity onPress={generateNewCode}>
                      <AdminIcon name="refresh" size={16} color={AdminColors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Direct Activation URL */}
              <View style={styles.activationUrlCard}>
                <Text style={styles.urlCardLabel}>
                  DIRECT SECURE ACTIVATION URL
                </Text>
                <View style={styles.urlRow}>
                  <Text style={styles.urlText} numberOfLines={1}>
                    https://purusharth.studio/join?token={inviteCode}
                  </Text>
                  <TouchableOpacity
                    style={styles.copyBtnSmall}
                    onPress={copyInviteLink}
                  >
                    <AdminIcon
                      name={copiedLink ? 'check' : 'content_copy'}
                      size={14}
                      color="#ffffff"
                    />
                    <Text style={styles.copyBtnSmallText}>
                      {copiedLink ? 'Copied' : 'Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIsInviteModalOpen(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSendBtn}
                onPress={handleSendInvite}
                disabled={isInviting}
              >
                {isInviting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <AdminIcon name="send" size={16} color="#ffffff" />
                    <Text style={styles.modalSendBtnText}>Send Invitation</Text>
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
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  rbacPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.primaryFixed,
  },
  rbacPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.onPrimaryFixed,
    letterSpacing: 0.6,
  },
  policySyncedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainerHigh,
  },
  syncedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  policySyncedText: {
    fontSize: 11,
    color: AdminColors.onSurfaceVariant,
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
  bannerRightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  auditCsvBtn: {
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
  auditCsvBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  createInviteBtn: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: AdminColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: AdminColors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  createInviteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Bento Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
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
    fontSize: 10.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.8,
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 6,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  kpiUnit: {
    fontSize: 12,
    color: AdminColors.secondary,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainerLow,
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
  greenPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  greenPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  amberPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#fffbeb',
  },
  amberPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  kpiSubMetric: {
    fontSize: 11,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  kpiIsolationNotice: {
    fontSize: 11,
    color: AdminColors.secondary,
  },
  // Active Key Box
  activeKeyBox: {
    backgroundColor: AdminColors.surfaceContainerLowest,
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 1,
  },
  activeKeyLeft: {
    flex: 1,
    minWidth: 260,
  },
  activeKeyLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.8,
  },
  activeKeyCode: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.onSurface,
    marginTop: 4,
    letterSpacing: 1,
  },
  activeKeyDescription: {
    fontSize: 12.5,
    color: AdminColors.secondary,
    marginTop: 6,
    lineHeight: 18,
  },
  activeKeyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copyKeyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyKeyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  refreshKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshKeyText: {
    fontSize: 12,
    fontWeight: '500',
    color: AdminColors.secondary,
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
  searchBox: {
    width: 280,
    height: 36,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 34,
    fontSize: 12.5,
    color: AdminColors.onSurface,
    outlineWidth: 0 as any,
  },
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusFilterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusFilterBtnActive: {
    backgroundColor: AdminColors.surfaceContainer,
  },
  statusFilterBtnText: {
    fontSize: 12,
    color: AdminColors.secondary,
    fontWeight: '500',
  },
  statusFilterBtnTextActive: {
    color: AdminColors.primary,
    fontWeight: '700',
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
    marginBottom: 24,
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
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: AdminColors.surfaceVariant,
  },
  adminName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  adminIdBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: AdminColors.surfaceContainer,
  },
  adminIdText: {
    fontSize: 10,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  clearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: AdminColors.secondaryContainer,
  },
  roleTagText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: AdminColors.onSecondaryFixed,
  },
  specialtyText: {
    fontSize: 11,
    color: AdminColors.secondary,
  },
  emailText: {
    fontSize: 12.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.onSurface,
  },
  eventChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AdminColors.surfaceContainerHigh,
    maxWidth: 160,
  },
  eventChipText: {
    fontSize: 11,
    color: AdminColors.onSurface,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10b981',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fffbeb',
  },
  pendingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#f59e0b',
  },
  pendingPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  suspendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#fef2f2',
  },
  suspendedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: AdminColors.error,
  },
  suspendedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: AdminColors.error,
  },
  lastActiveText: {
    fontSize: 11.5,
    color: AdminColors.secondary,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  // Security Banner
  securityBanner: {
    backgroundColor: AdminColors.surfaceContainerLow,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 32,
  },
  securityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: AdminColors.onSurface,
  },
  securityDesc: {
    fontSize: 12,
    color: AdminColors.secondary,
    lineHeight: 18,
    marginTop: 2,
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
  blueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.primary,
  },
  modalCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.primary,
    letterSpacing: 0.6,
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
  modalForm: {
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
  tokenBox: {
    height: 40,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tokenText: {
    fontSize: 12.5,
    fontFamily: AdminTypography.fontFamily.mono,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  activationUrlCard: {
    backgroundColor: AdminColors.surfaceContainerHigh,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
    gap: 6,
  },
  urlCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.6,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  urlText: {
    fontSize: 11.5,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.onSurface,
    flex: 1,
  },
  copyBtnSmall: {
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnSmallText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.25)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.surfaceContainerLow,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: AdminColors.onSurface,
  },
  modalSendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AdminColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalSendBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});

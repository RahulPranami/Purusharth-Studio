import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { AdminIcon } from './AdminIcon';
import { AdminColors, AdminTypography } from '@/constants/admin-theme';
import { useAuth } from '@/context/auth-context';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: string[];
  activeTab?: string;
}

export function AdminLayout({
  children,
  title = 'Superadmin Overview',
  breadcrumbs = ['Console', 'Superadmin Overview'],
}: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 10
    : Math.max(insets.top, 12);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { profile, signOut, isAuthenticated, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/admin/login' as any);
    }
  }, [loading, isAuthenticated]);

  const navItems = [
    {
      name: 'Dashboard',
      path: '/admin',
      icon: 'space_dashboard',
      badge: null,
    },
    {
      name: 'Events',
      path: '/admin/events',
      icon: 'calendar_month',
      badge: '12',
    },
    {
      name: 'Photo Uploads',
      path: '/admin/uploads',
      icon: 'cloud_upload',
      badge: 'Active',
    },
    {
      name: 'Admins',
      path: '/admin/admins',
      icon: 'admin_panel_settings',
      badge: null,
    },
    {
      name: 'Collections',
      path: '/admin/events',
      icon: 'photo_library',
      badge: null,
    },
    {
      name: 'Settings',
      path: '/admin',
      icon: 'settings',
      badge: null,
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // ignore
    }
    router.replace('/admin/login' as any);
  };

  const renderNavContent = () => (
    <View style={styles.sidebarInner}>
      {/* Brand Header */}
      <View style={styles.brandHeader}>
        <Image
          source={require('@/assets/images/studio-logo-transparent.png')}
          style={{ width: 140, height: 38 }}
          contentFit="contain"
        />
      </View>

      {/* Nav Section Label */}
      <View style={styles.navSectionHeader}>
        <Text style={styles.navSectionLabel}>PLATFORM OPERATIONS</Text>
      </View>

      {/* Navigation Links */}
      <View style={styles.navList}>
        {navItems.map((item) => {
          const isActive =
            item.path === '/admin'
              ? pathname === '/admin' || pathname === '/admin/'
              : pathname.startsWith(item.path);

          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
              ]}
              onPress={() => {
                setMobileMenuOpen(false);
                router.push(item.path as any);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.navItemLeft}>
                <AdminIcon
                  name={item.icon}
                  size={19}
                  color={isActive ? AdminColors.gold : AdminColors.secondary}
                />
                <Text
                  style={[
                    styles.navItemText,
                    isActive && styles.navItemTextActive,
                  ]}
                >
                  {item.name}
                </Text>
              </View>

              {item.badge && (
                <View
                  style={[
                    styles.navBadge,
                    item.badge === 'Active'
                      ? styles.navBadgeActive
                      : styles.navBadgeCount,
                  ]}
                >
                  <Text
                    style={[
                      styles.navBadgeText,
                      item.badge === 'Active'
                        ? styles.navBadgeTextActive
                        : styles.navBadgeTextCount,
                    ]}
                  >
                    {item.badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Archival Vault Widget in Sidebar */}
      <View style={styles.archivalWidget}>
        <View style={styles.archivalHeader}>
          <Text style={styles.archivalLabel}>ARCHIVAL VAULT</Text>
          <Text style={styles.archivalPercent}>42.8%</Text>
        </View>
        <View style={styles.archivalBarBackground}>
          <View style={[styles.archivalBarFill, { width: '42.8%' }]} />
        </View>
        <Text style={styles.archivalSubtext}>428 GB of 1 TB Used (R2)</Text>
      </View>

      {/* User Footer Profile */}
      <View style={styles.userFooter}>
        <View style={styles.userProfileInfo}>
          <View style={styles.avatarCircle}>
            <AdminIcon name="person" size={18} color="#ffffff" />
            <View style={styles.avatarOnlineDot} />
          </View>
          <View style={styles.userTextInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {profile?.display_name || 'Aaditya Purusharth'}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {profile?.email || 'superadmin@purusharth.studio'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
        >
          <AdminIcon name="logout" size={18} color={AdminColors.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.rootContainer}>
      {/* Desktop Sidebar */}
      {isDesktop && <View style={styles.desktopSidebar}>{renderNavContent()}</View>}

      {/* Mobile Drawer */}
      {!isDesktop && (
        <Modal
          visible={mobileMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={() => setMobileMenuOpen(false)}
            />
            <View style={[styles.mobileDrawerContent, { paddingTop: topInset }]}>
              <TouchableOpacity
                style={styles.closeDrawerBtn}
                onPress={() => setMobileMenuOpen(false)}
              >
                <AdminIcon name="close" size={22} color={AdminColors.secondary} />
              </TouchableOpacity>
              {renderNavContent()}
            </View>
          </View>
        </Modal>
      )}

      {/* Main Container Area */}
      <View style={[styles.mainArea, isDesktop && styles.mainAreaDesktop]}>
        {/* Top Header */}
        <View
          style={[
            styles.topHeader,
            !isDesktop && {
              paddingTop: topInset,
              height: undefined,
              minHeight: topInset + 54,
            },
          ]}
        >
          {/* Left: Mobile hamburger & Breadcrumbs */}
          <View style={styles.headerLeft}>
            {!isDesktop && (
              <TouchableOpacity
                onPress={() => setMobileMenuOpen(true)}
                style={styles.hamburgerBtn}
              >
                <AdminIcon name="menu" size={24} color={AdminColors.onSurface} />
              </TouchableOpacity>
            )}

            <View style={styles.breadcrumbsContainer}>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && (
                    <AdminIcon
                      name="chevron_right"
                      size={15}
                      color={AdminColors.outline}
                      style={{ marginHorizontal: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.breadcrumbText,
                      idx === breadcrumbs.length - 1 && styles.breadcrumbActive,
                    ]}
                  >
                    {crumb}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Right: Search, Cluster health, Notifications, Avatar */}
          <View style={styles.headerRight}>
            {/* Search input with ⌘K badge */}
            <View style={styles.searchBar}>
              <AdminIcon
                name="search"
                size={17}
                color={AdminColors.outline}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search events, admins, photos..."
                placeholderTextColor={AdminColors.outline}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              <View style={styles.cmdKBadge}>
                <Text style={styles.cmdKText}>⌘K</Text>
              </View>
            </View>

            {/* Worker Cluster Health Badge (hidden on narrow screens) */}
            {width >= 768 && (
              <View style={styles.clusterBadge}>
                <View style={styles.clusterPulseDot} />
                <Text style={styles.clusterBadgeText}>Worker Cluster: 99.8% Healthy</Text>
              </View>
            )}

            {/* Notification bell */}
            <TouchableOpacity style={styles.iconButton}>
              <AdminIcon name="notifications" size={20} color={AdminColors.secondary} />
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>3</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerDivider} />

            {/* User Profile Mini Avatar */}
            <TouchableOpacity
              onPress={() => router.push('/admin/admins' as any)}
              style={styles.headerAvatar}
            >
              <AdminIcon name="person" size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Body with Scroll */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: AdminColors.background,
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : '100%',
  },
  desktopSidebar: {
    width: 250,
    backgroundColor: AdminColors.surfaceContainerLowest,
    borderRightWidth: 1,
    borderRightColor: 'rgba(195, 198, 215, 0.35)',
    zIndex: 50,
    height: Platform.OS === 'web' ? ('100vh' as any) : '100%',
    position: Platform.OS === 'web' ? ('sticky' as any) : 'relative',
    top: 0,
    flexShrink: 0,
  },
  sidebarInner: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  brandHeader: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.2)',
  },
  brandLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: AdminColors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTextBox: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AdminColors.onSurface,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: AdminColors.secondary,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  navSectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  navSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.outline,
    letterSpacing: 1,
  },
  navList: {
    paddingHorizontal: 10,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: AdminColors.primaryFixed,
    borderLeftWidth: 3,
    borderLeftColor: AdminColors.gold,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navItemText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: AdminColors.onSurfaceVariant,
  },
  navItemTextActive: {
    fontWeight: '600',
    color: AdminColors.gold,
  },
  navBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  navBadgeActive: {
    backgroundColor: AdminColors.secondaryContainer,
  },
  navBadgeCount: {
    backgroundColor: AdminColors.surfaceContainerHigh,
  },
  navBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  navBadgeTextActive: {
    color: AdminColors.onSecondaryFixed,
  },
  navBadgeTextCount: {
    color: AdminColors.onSurfaceVariant,
  },
  archivalWidget: {
    marginHorizontal: 12,
    marginTop: 'auto',
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: AdminColors.surfaceContainerLow,
    gap: 6,
  },
  archivalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  archivalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: AdminColors.secondary,
    letterSpacing: 0.8,
  },
  archivalPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: AdminColors.primary,
  },
  archivalBarBackground: {
    height: 6,
    borderRadius: 4,
    backgroundColor: AdminColors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  archivalBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: AdminColors.primaryContainer,
  },
  archivalSubtext: {
    fontSize: 10.5,
    color: AdminColors.onSurfaceVariant,
  },
  userFooter: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(195, 198, 215, 0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  userTextInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: AdminColors.onSurface,
  },
  userEmail: {
    fontSize: 10.5,
    color: AdminColors.secondary,
    fontFamily: AdminTypography.fontFamily.mono,
  },
  signOutBtn: {
    padding: 6,
    borderRadius: 6,
  },
  // Main Area
  mainArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    backgroundColor: AdminColors.background,
  },
  mainAreaDesktop: {
    minWidth: 0,
  },
  topHeader: {
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(195, 198, 215, 0.35)',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 40,
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as any,
          top: 0,
          backdropFilter: 'blur(8px)',
        }
      : {}),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerBtn: {
    padding: 4,
  },
  breadcrumbsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    fontSize: 13,
    color: AdminColors.secondary,
    fontWeight: '400',
  },
  breadcrumbActive: {
    color: AdminColors.onSurface,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    position: 'relative',
    width: 260,
    height: 36,
    borderRadius: 8,
    backgroundColor: AdminColors.surface,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 34,
    fontSize: 12.5,
    color: AdminColors.onSurface,
    padding: 0,
    outlineWidth: 0 as any,
  },
  cmdKBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(195, 198, 215, 0.6)',
    backgroundColor: AdminColors.surfaceContainerLowest,
  },
  cmdKText: {
    fontSize: 10,
    fontFamily: AdminTypography.fontFamily.mono,
    color: AdminColors.secondary,
  },
  clusterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  clusterPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  clusterBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#047857',
  },
  iconButton: {
    position: 'relative',
    padding: 6,
    borderRadius: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: AdminColors.error,
    borderRadius: 8,
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
  },
  headerDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(195, 198, 215, 0.5)',
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AdminColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mobile Modal
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 27, 43, 0.45)',
  },
  mobileDrawerContent: {
    width: 270,
    backgroundColor: AdminColors.surfaceContainerLowest,
    height: '100%',
    zIndex: 100,
  },
  closeDrawerBtn: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
});

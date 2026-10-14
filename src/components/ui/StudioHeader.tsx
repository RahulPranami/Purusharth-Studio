import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioIcon } from './StudioIcon';

interface StudioHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  hideAuth?: boolean;
}

export function StudioHeader({
  title = 'Purusharth Studio',
  subtitle = 'Your Moments. Your Memories.',
  showBack = false,
  onBack,
  rightAction,
  hideAuth = false,
}: StudioHeaderProps) {
  const router = useRouter();
  const { user, profile, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();

  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight || 0) + 6
    : Math.max(insets.top, 12);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: topInset }]}>
      <View style={styles.headerContent}>
        {/* Left: Back button or Logo + Title */}
        <View style={styles.leftSection}>
          {showBack ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              accessibilityLabel="Go back"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <StudioIcon name="arrow_back_ios" size={20} color={StudioTheme.colors.onSurface} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.brandTouchable}
            onPress={() => router.push('/')}
            activeOpacity={0.8}
          >
            <Image
              source={require('@/../assets/images/purusharth-studio-logo.jpg')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <View style={styles.titlesContainer}>
              <Text style={styles.brandTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.brandSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Right Section: Custom right action OR Profile/Admin status */}
        <View style={styles.rightSection}>
          {rightAction}

          {/* Admin Fast-Switch indicator */}
          {!hideAuth && isAdmin ? (
            <TouchableOpacity
              style={styles.adminPill}
              onPress={() => router.push('/admin' as any)}
              activeOpacity={0.8}
            >
              <StudioIcon name="space_dashboard" size={14} color={StudioTheme.colors.secondary} />
              <Text style={styles.adminPillText}>Console</Text>
            </TouchableOpacity>
          ) : null}

          {/* Profile Avatar / Sign In */}
          {!hideAuth && (
            isAuthenticated ? (
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={() => router.push('/profile')}
                activeOpacity={0.8}
                accessibilityLabel="Open Profile"
              >
                {profile?.selfie_url || profile?.avatar_url ? (
                  <Image
                    source={{ uri: (profile.selfie_url || profile.avatar_url) as string }}
                    style={styles.avatarImg}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>
                      {(profile?.display_name || user?.email || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => router.push('/login')}
                activeOpacity={0.8}
              >
                <StudioIcon name="person" size={16} color={StudioTheme.colors.onPrimary} />
                <Text style={styles.signInText}>Sign In</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(251, 249, 244, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: StudioTheme.colors.hairline,
    zIndex: 50,
  },
  headerContent: {
    height: 60,
    paddingHorizontal: StudioTheme.spacing.marginMobile,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    borderRadius: StudioTheme.radius.full,
    backgroundColor: StudioTheme.colors.surfaceContainerLow,
  },
  brandTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: StudioTheme.radius.full,
    marginRight: 10,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
  },
  titlesContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
  },
  brandTitle: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    fontWeight: '500',
    color: StudioTheme.colors.onSurface,
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    color: StudioTheme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: StudioTheme.colors.secondaryContainer,
    borderRadius: StudioTheme.radius.full,
  },
  adminPillText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: StudioTheme.colors.onSecondaryContainer,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: StudioTheme.radius.full,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: StudioTheme.colors.secondary,
    backgroundColor: StudioTheme.colors.surfaceContainerLowest,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: StudioTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: Fonts.sans,
    color: StudioTheme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: StudioTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: StudioTheme.radius.xl,
  },
  signInText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: StudioTheme.colors.onPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});

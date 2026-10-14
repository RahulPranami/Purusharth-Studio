import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/auth-context';
import { StudioTheme, Fonts } from '@/constants/theme';
import { StudioIcon } from './StudioIcon';

interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: string;
}

export function StudioBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      route: '/',
      icon: 'photo_camera',
    },
    {
      id: 'events',
      label: 'Events',
      route: '/events',
      icon: 'auto_awesome_motion',
    },
    {
      id: 'find-photos',
      label: 'Find Photos',
      route: '/find-photos',
      icon: 'face_retouching_natural',
    },
    {
      id: 'profile',
      label: isAdmin ? 'Studio Admin' : 'Profile',
      route: isAdmin ? '/admin' : '/profile',
      icon: isAdmin ? 'dashboard_customize' : 'person',
    },
  ];

  const isCurrentRoute = (route: string) => {
    if (route === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.navContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.dockSurface}>
        {navItems.map((item) => {
          const active = isCurrentRoute(item.route);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navButton}
              onPress={() => {
                if (pathname !== item.route) {
                  router.push(item.route as any);
                }
              }}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
            >
              <View style={[styles.iconWrapper, active && styles.activeIconWrapper]}>
                <StudioIcon
                  name={item.icon}
                  size={22}
                  color={active ? StudioTheme.colors.primary : StudioTheme.colors.outline}
                />
              </View>
              <Text
                style={[
                  styles.navLabel,
                  active ? styles.activeNavLabel : styles.inactiveNavLabel,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(251, 249, 244, 0.95)',
    borderTopWidth: 1,
    borderTopColor: StudioTheme.colors.hairline,
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#1B1C19',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        backdropFilter: 'blur(16px)',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
      } as any,
    }),
  },
  dockSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 58,
    paddingHorizontal: 8,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 48,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    transform: [{ scale: 1.05 }],
  },
  navLabel: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  activeNavLabel: {
    fontWeight: '700',
    color: StudioTheme.colors.primary,
  },
  inactiveNavLabel: {
    fontWeight: '500',
    color: StudioTheme.colors.outline,
  },
});

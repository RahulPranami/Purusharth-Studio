import React from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface StudioIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// Map Stitch / Material Symbols names to Expo @expo/vector-icons names
const VECTOR_ICON_MAP: Record<string, { family: 'material' | 'community'; icon: any }> = {
  photo_camera: { family: 'material', icon: 'photo-camera' },
  camera: { family: 'material', icon: 'camera-alt' },
  auto_awesome_motion: { family: 'material', icon: 'auto-awesome-motion' },
  face_retouching_natural: { family: 'material', icon: 'face-retouching-natural' },
  face: { family: 'material', icon: 'face' },
  face_check: { family: 'community', icon: 'face-recognition' },
  dashboard_customize: { family: 'material', icon: 'dashboard-customize' },
  space_dashboard: { family: 'material', icon: 'space-dashboard' },
  person: { family: 'material', icon: 'person' },
  notifications: { family: 'material', icon: 'notifications' },
  verified: { family: 'material', icon: 'verified' },
  verified_user: { family: 'material', icon: 'verified-user' },
  shield: { family: 'material', icon: 'shield' },
  lock_open: { family: 'material', icon: 'lock-open' },
  lock: { family: 'material', icon: 'lock' },
  lock_clock: { family: 'material', icon: 'lock-clock' },
  arrow_forward: { family: 'material', icon: 'arrow-forward' },
  arrow_back: { family: 'material', icon: 'arrow-back' },
  arrow_back_ios: { family: 'material', icon: 'arrow-back-ios' },
  chevron_right: { family: 'material', icon: 'chevron-right' },
  close: { family: 'material', icon: 'close' },
  search: { family: 'material', icon: 'search' },
  burst_mode: { family: 'material', icon: 'burst-mode' },
  photo_library: { family: 'material', icon: 'photo-library' },
  videocam: { family: 'material', icon: 'videocam' },
  movie: { family: 'material', icon: 'movie' },
  play_arrow: { family: 'material', icon: 'play-arrow' },
  play_circle: { family: 'material', icon: 'play-circle-outline' },
  favorite: { family: 'material', icon: 'favorite' },
  favorite_border: { family: 'material', icon: 'favorite-border' },
  cloud_download: { family: 'material', icon: 'cloud-download' },
  download: { family: 'material', icon: 'download' },
  download_done: { family: 'material', icon: 'download-done' },
  ios_share: { family: 'material', icon: 'share' },
  share: { family: 'material', icon: 'share' },
  check: { family: 'material', icon: 'check' },
  check_circle: { family: 'material', icon: 'check-circle' },
  stars: { family: 'material', icon: 'stars' },
  auto_awesome: { family: 'material', icon: 'auto-awesome' },
  schedule: { family: 'material', icon: 'schedule' },
  sms: { family: 'material', icon: 'sms' },
  mail: { family: 'material', icon: 'mail-outline' },
  alternate_email: { family: 'material', icon: 'alternate-email' },
  key: { family: 'material', icon: 'vpn-key' },
  tag: { family: 'community', icon: 'pound' },
  signature: { family: 'community', icon: 'draw' },
  center_focus_strong: { family: 'material', icon: 'center-focus-strong' },
  shutter_speed: { family: 'material', icon: 'shutter-speed' },
  psychology: { family: 'material', icon: 'psychology' },
  nightlife: { family: 'material', icon: 'nightlife' },
  grid_view: { family: 'material', icon: 'grid-view' },
  view_agenda: { family: 'material', icon: 'view-agenda' },
  swap_vert: { family: 'material', icon: 'swap-vert' },
  expand_more: { family: 'material', icon: 'expand-more' },
  unfold_more: { family: 'material', icon: 'unfold-more' },
  tune: { family: 'material', icon: 'tune' },
  wb_sunny: { family: 'material', icon: 'wb-sunny' },
  room_service: { family: 'material', icon: 'room-service' },
  calendar_today: { family: 'material', icon: 'calendar-today' },
  workspace_premium: { family: 'material', icon: 'workspace-premium' },
  arrow_drop_down: { family: 'material', icon: 'arrow-drop-down' },
  image: { family: 'material', icon: 'image' },
  logout: { family: 'material', icon: 'logout' },
  info: { family: 'material', icon: 'info' },
  warning: { family: 'material', icon: 'warning' },
  error: { family: 'material', icon: 'error' },
};

export function StudioIcon({ name, size = 20, color = '#1B1C19', style }: StudioIconProps) {
  // On web, use the linked Google Material Symbols font directly
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          styles.webIcon,
          {
            fontSize: size,
            lineHeight: size,
            width: size,
            height: size,
            color,
          },
          style,
        ]}
      >
        {name}
      </Text>
    );
  }

  // On Native (iOS/Android), use mapped @expo/vector-icons
  const mapping = VECTOR_ICON_MAP[name];
  if (mapping) {
    if (mapping.family === 'community') {
      return <MaterialCommunityIcons name={mapping.icon} size={size} color={color} style={style} />;
    }
    return <MaterialIcons name={mapping.icon} size={size} color={color} style={style} />;
  }

  // Fallback to MaterialIcons with clean name
  const fallbackName = name.replace(/_/g, '-') as any;
  return <MaterialIcons name={fallbackName} size={size} color={color} style={style} />;
}

const styles = StyleSheet.create({
  webIcon: {
    fontFamily: 'Material Symbols Outlined',
    userSelect: 'none',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
});

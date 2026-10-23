import { useMemo } from 'react';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { TrailNameField } from '@/components/log/TrailNameField';
import { isCatalogTrail, OSM_CREDIT } from '@/lib/catalog';
import { formatDistance, formatOptionalDistance, formatOptionalElevation } from '@/lib/format';
import { mapCoverUrl } from '@/lib/trailCover';
import { fonts, type Palette } from '@/theme/tokens';
import type { Trail } from '@/types/trail';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
/** Under this the start is "at the trailhead". */
const AT_START_M = 160;

export interface TrailSuggestion {
  trail: Trail;
  startDistanceM: number;
}

interface TrailAssignSheetProps {
  visible: boolean;
  suggestions: TrailSuggestion[];
  /** Every trail, for search. */
  trails: Trail[];
  onPick: (trailId: string) => void;
  /** Called with a cleaned name. */
  onCreate: (name: string) => void;
  onClose: () => void;
}

export function startLabel(meters: number): string {
  if (meters < AT_START_M) return 'AT YOUR START';
  return `${formatDistance(meters / 1000).toUpperCase()} FROM YOUR START`;
}

function SuggestionCard({ suggestion, onPress }: { suggestion: TrailSuggestion; onPress: () => void }) {
  const styles = useStyles();
  const c = useColors();
  const { trail, startDistanceM } = suggestion;
  const cover = mapCoverUrl(trail.path, MAPBOX_TOKEN, { width: 600, height: 260 });
  const meta = [
    startLabel(startDistanceM),
    formatOptionalDistance(trail.distance_km).toUpperCase(),
    `▲${formatOptionalElevation(trail.elevation_gain_m).toUpperCase()}`,
  ].join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${trail.name}, ${trail.region}. ${startLabel(startDistanceM).toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View style={styles.card}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessible={false} />
        ) : null}
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
          <Defs>
            <LinearGradient id="assignShade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.15" stopColor={c.bg} stopOpacity={0} />
              <Stop offset="1" stopColor={c.bg} stopOpacity={0.9} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#assignShade)" />
        </Svg>
        {isCatalogTrail(trail) ? <Text style={styles.credit}>{OSM_CREDIT}</Text> : null}
        <View style={styles.info} pointerEvents="none">
          <Text style={styles.name} numberOfLines={2}>
            {trail.name}
          </Text>
          <Text style={styles.region} numberOfLines={1}>
            {trail.region}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

/** Finish on a hike that started without a trail: pick the suggested one, or name it. */
export function TrailAssignSheet({ visible, suggestions, trails, onPick, onCreate, onClose }: TrailAssignSheetProps) {
  const styles = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.66)' }}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: '90%' }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>Which trail was this?</Text>
            <Pressable accessibilityLabel="Close" onPress={onClose}>
              <View style={styles.close}>
                <X size={18} strokeWidth={1.75} color={c.fgMuted} />
              </View>
            </Pressable>
          </View>
          <Text style={styles.lede}>
            {suggestions.length > 0
              ? 'Your hike started near these trailheads.'
              : 'No known trailhead near where you started. Name it and it becomes your trail.'}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingTop: 14, paddingBottom: 8 }}>
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.trail.id}
                suggestion={suggestion}
                onPress={() => onPick(suggestion.trail.id)}
              />
            ))}
            <Text style={styles.label}>{suggestions.length > 0 ? 'SOMEWHERE ELSE' : 'NAME IT'}</Text>
            <TrailNameField trails={trails} onPick={onPick} onCreate={onCreate} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 10,
} as const;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  sheet: {
    backgroundColor: c.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: c.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.borderStrong,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  title: { color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 26, flexShrink: 1 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lede: { marginTop: 6, paddingHorizontal: 4, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  card: {
    height: 136,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.raised,
  },
  credit: {
    position: 'absolute',
    top: 10,
    right: 12,
    color: c.fg2,
    fontFamily: fonts.ui,
    fontSize: 11,
    ...TEXT_SHADOW,
  },
  info: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  name: { color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 22, lineHeight: 26, ...TEXT_SHADOW },
  region: { marginTop: 1, color: c.fg2, fontFamily: fonts.ui, fontSize: 13, ...TEXT_SHADOW },
  meta: {
    marginTop: 6,
    color: c.fg2,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    ...TEXT_SHADOW,
  },
  label: {
    marginTop: 10,
    paddingHorizontal: 4,
    color: c.fgFaint,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.6,
  },
});

/** Styles for the current appearance. */
function useStyles() {
  const c = useColors();
  return useMemo(() => makeStyles(c), [c]);
}

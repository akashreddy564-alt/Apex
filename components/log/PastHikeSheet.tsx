import * as ImagePicker from 'expo-image-picker';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

import { HikeDateField } from '@/components/log/HikeDateField';
import { MISSING_METRIC } from '@/lib/format';
import { persistHikePhoto, resolvePhotoUri } from '@/lib/hikePhotos';
import { formatHikeDay, suggestHikeType } from '@/lib/pastHike';
import { DEFAULT_HIKE_TYPE, HIKE_TYPE_LABELS, HIKE_TYPES } from '@/lib/ranking';
import { colors, fonts, numericStyle } from '@/theme/tokens';
import type { ElevationSample, Trail } from '@/types/trail';
const CHIPS = ['Dry', 'Muddy', 'Snow', 'Rocky', 'Rain', 'Fog', 'Hot', 'Windy'] as const;
const TERRAIN = new Set(['Snow', 'Rocky']);
const EFFORT = ['Easy', 'Moderate', 'Hard', 'Very hard'] as const;

interface PastHikeSheetProps {
  visible: boolean;
  trails: Trail[];
  trailId: string;
  onTrailId: (id: string) => void;
  onClose: () => void;
  onContinue: (draft: {
    trailId: string;
    hikedOn: Date;
    hours: number;
    minutes: number;
    notes: string;
    distanceKm: number | null;
    terrain: string[];
    conditions: string[];
    difficulty: string | null;
    hikeType: string | null;
    photos: string[];
  }) => void;
}

function MiniProfile({ samples }: { samples: ElevationSample[] }) {
  if (samples.length < 2) return <View style={{ width: 64, height: 32 }} />;
  const width = 64;
  const height = 32;
  const maxDistance = samples[samples.length - 1]?.distance_m || 1;
  const elevations = samples.map((sample) => sample.elevation_m);
  const low = Math.min(...elevations);
  const span = Math.max(Math.max(...elevations) - low, 1);
  const line = samples
    .map((sample, index) => {
      const x = (sample.distance_m / maxDistance) * (width - 4) + 2;
      const y = height - 4 - ((sample.elevation_m - low) / span) * (height - 8);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const area = `${line} L${width - 2} ${height} L2 ${height} Z`;
  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={colors.sage} fillOpacity={0.12} />
      <Path d={line} stroke={colors.sage} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function stepMinutes(hours: number, minutes: number, delta: number): { hours: number; minutes: number } {
  const total = Math.max(0, hours * 60 + minutes + delta);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Beli-style past hike sheet. Trail and date are required. Continue is the only sage control. */
export function PastHikeSheet({
  visible,
  trails,
  trailId,
  onTrailId,
  onClose,
  onContinue,
}: PastHikeSheetProps) {
  const insets = useSafeAreaInsets();
  const trail = trails.find((item) => item.id === trailId) ?? trails[0] ?? null;
  const [hikedOn, setHikedOn] = useState(() => new Date());
  const [showDate, setShowDate] = useState(false);
  const [pickingTrail, setPickingTrail] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [distanceText, setDistanceText] = useState('');
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [editingDistance, setEditingDistance] = useState(false);
  const [typeTouched, setTypeTouched] = useState(false);
  const [hikeType, setHikeType] = useState<string>(DEFAULT_HIKE_TYPE);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const maximumDate = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!trail || distanceTouched) return;
    setDistanceText(trail.distance_km == null ? '' : trail.distance_km.toFixed(1));
  }, [distanceTouched, trail]);

  useEffect(() => {
    if (!trail || typeTouched) return;
    if (trail.distance_km == null || trail.elevation_gain_m == null) return;
    setHikeType(suggestHikeType(trail.distance_km, trail.elevation_gain_m));
  }, [trail, typeTouched]);

  const distanceKm = distanceText.trim() === '' ? null : Number(distanceText);
  const terrain = selectedChips.filter((chip) => TERRAIN.has(chip));
  const conditions = selectedChips.filter((chip) => !TERRAIN.has(chip));

  const addPhoto = () => {
    void ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 }).then(
      async (result) => {
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset?.uri) return;
        try {
          setPhotoError(null);
          const stored = await persistHikePhoto({
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
          });
          setPhotos((current) => [...current, stored]);
        } catch {
          const message = 'Could not add that photo.';
          setPhotoError(message);
          AccessibilityInfo.announceForAccessibility(message);
        }
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View
          style={{
            flex: 1,
            marginTop: insets.top + 8,
            backgroundColor: colors.bg,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            overflow: 'hidden',
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.borderStrong,
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  color: colors.fg,
                  fontFamily: fonts.displayExtraBold,
                  fontWeight: 'normal',
                  fontSize: 26,
                }}
              >
                Log a past hike
              </Text>
              <Pressable
                accessibilityLabel="Close"
                onPress={onClose}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 14,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={colors.fgMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {pickingTrail ? (
              <View style={{ marginTop: 8 }}>
                {trails.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onTrailId(item.id);
                      setDistanceTouched(false);
                      setTypeTouched(false);
                      setPickingTrail(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: colors.raised,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: colors.fg, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                      {item.name}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
                      {item.region}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose trail"
                  onPress={() => setPickingTrail(true)}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Trail</Text>
                    <Text style={{ marginTop: 3, fontSize: 16, color: colors.fg, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                      {trail?.name ?? 'Choose a trail'}
                    </Text>
                    {trail ? (
                      <Text style={{ marginTop: 2, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
                        {trail.region} · {trail.distance_km == null ? MISSING_METRIC : `${trail.distance_km.toFixed(1)} km`} ·{' '}
                        {trail.elevation_gain_m == null ? MISSING_METRIC : `${Math.round(trail.elevation_gain_m)} m gain`}
                      </Text>
                    ) : null}
                  </View>
                  <MiniProfile samples={trail?.elevation_profile ?? []} />
                  <ChevronRight size={16} strokeWidth={2.2} color={colors.fgFaint} />
                </Pressable>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Date</Text>
                    <Text style={{ marginTop: 3, fontSize: 16, color: colors.fg, ...numericStyle('semibold') }}>
                      {formatHikeDay(hikedOn)}
                    </Text>
                  </View>
                  <Pressable accessibilityLabel="Change date" onPress={() => setShowDate((open) => !open)}>
                    <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Change</Text>
                  </Pressable>
                </View>
                {showDate ? (
                  <HikeDateField value={hikedOn} maximumDate={maximumDate} onChange={setHikedOn} />
                ) : null}

                <Text style={{ marginTop: 6, paddingVertical: 6, fontSize: 13, color: colors.fgFaint, fontFamily: fonts.ui }}>
                  Optional details
                </Text>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    gap: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Time taken</Text>
                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Pressable
                        accessibilityLabel="Decrease time"
                        onPress={() => {
                          const next = stepMinutes(hours, minutes, -5);
                          setHours(next.hours);
                          setMinutes(next.minutes);
                        }}
                        style={stepStyle}
                      >
                        <Text style={{ fontSize: 18, color: colors.fg2 }}>−</Text>
                      </Pressable>
                      <Text style={{ fontSize: 20, color: colors.fg, ...numericStyle('semibold') }}>
                        {hours}
                        <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.uiMedium }}>h </Text>
                        {String(minutes).padStart(2, '0')}
                        <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.uiMedium }}>m</Text>
                      </Text>
                      <Pressable
                        accessibilityLabel="Increase time"
                        onPress={() => {
                          const next = stepMinutes(hours, minutes, 5);
                          setHours(next.hours);
                          setMinutes(next.minutes);
                        }}
                        style={stepStyle}
                      >
                        <Text style={{ fontSize: 18, color: colors.fg2 }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ width: 1, backgroundColor: colors.raised }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Distance</Text>
                      <Text style={{ fontSize: 12, color: colors.fgFaint, fontFamily: fonts.ui }}>
                        {distanceTouched ? 'Edited' : 'From trail'}
                      </Text>
                    </View>
                    <View style={{ marginTop: 6, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      {editingDistance ? (
                        <TextInput
                          value={distanceText}
                          onChangeText={(value) => {
                            setDistanceTouched(true);
                            setDistanceText(value.replace(/[^0-9.]/g, ''));
                          }}
                          onBlur={() => setEditingDistance(false)}
                          autoFocus
                          keyboardType="decimal-pad"
                          accessibilityLabel="Distance in kilometres"
                          style={{ flex: 1, fontSize: 20, color: colors.fg, ...numericStyle('semibold') }}
                        />
                      ) : (
                        <Text style={{ fontSize: 20, color: colors.fg, ...numericStyle('semibold') }}>
                          {distanceText || MISSING_METRIC}
                          {distanceText ? (
                            <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.uiMedium }}> km</Text>
                          ) : null}
                        </Text>
                      )}
                      <Pressable accessibilityLabel="Edit distance" onPress={() => setEditingDistance(true)}>
                        <Text style={{ fontSize: 13, color: colors.fg2, fontFamily: fonts.ui }}>Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {HIKE_TYPES.length > 1 ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: colors.raised, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Hike type</Text>
                      <Text style={{ flexShrink: 1, fontSize: 12, color: colors.fgFaint, fontFamily: fonts.ui }}>
                        Suggested from distance and gain
                      </Text>
                    </View>
                    <View
                      style={{
                        marginTop: 9,
                        flexDirection: 'row',
                        gap: 3,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.raised,
                        borderRadius: 12,
                        padding: 3,
                      }}
                    >
                      {HIKE_TYPES.map((type) => {
                        const on = hikeType === type;
                        return (
                          <Pressable
                            key={type}
                            onPress={() => {
                              setTypeTouched(true);
                              setHikeType(type);
                            }}
                            style={{
                              flex: 1,
                              height: 36,
                              borderRadius: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: on ? colors.fg : 'transparent',
                              paddingHorizontal: 2,
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              style={{
                                fontSize: 12,
                                color: on ? colors.onSage : colors.fgMuted,
                                fontFamily: fonts.uiSemibold,
                                fontWeight: 'normal',
                              }}
                            >
                              {HIKE_TYPE_LABELS[type]}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={{ borderTopWidth: 1, borderTopColor: colors.raised, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
                    Terrain and conditions
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {CHIPS.map((chip) => (
                      <Chip
                        key={chip}
                        label={chip}
                        on={selectedChips.includes(chip)}
                        onPress={() =>
                          setSelectedChips((current) =>
                            current.includes(chip)
                              ? current.filter((item) => item !== chip)
                              : [...current, chip],
                          )
                        }
                      />
                    ))}
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.raised, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>
                    How hard did it feel?
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {EFFORT.map((item) => (
                      <Chip
                        key={item}
                        label={item}
                        on={difficulty === item}
                        onPress={() => setDifficulty((current) => (current === item ? null : item))}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.raised, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Snow patches, pace, who you went with"
                    placeholderTextColor={colors.fgFaint}
                    accessibilityLabel="Notes"
                    multiline
                    style={{
                      marginTop: 5,
                      minHeight: 44,
                      fontSize: 15,
                      color: colors.fg2,
                      fontFamily: fonts.ui,
                    }}
                  />
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: colors.raised, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}>Photos</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {photos.map((uri) => (
                      <PastPhoto key={uri} stored={uri} />
                    ))}
                    <Pressable
                      accessibilityLabel="Add photo"
                      onPress={addPhoto}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: colors.borderStrong,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 22, color: colors.fgMuted }}>+</Text>
                    </Pressable>
                  </View>
                  {photoError ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={{ marginTop: 8, fontSize: 13, color: colors.fgMuted, fontFamily: fonts.ui }}
                    >
                      {photoError}
                    </Text>
                  ) : null}
                </View>
              </>
            )}
          </ScrollView>

          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.bg,
              borderTopWidth: 1,
              borderTopColor: colors.raised,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={!trail}
              onPress={() => {
                if (!trail) return;
                onContinue({
                  trailId: trail.id,
                  hikedOn,
                  hours,
                  minutes,
                  notes,
                  distanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
                  terrain,
                  conditions,
                  difficulty,
                  hikeType: HIKE_TYPES.length === 1 ? HIKE_TYPES[0] : hikeType,
                  photos,
                });
              }}
              style={{
                height: 56,
                borderRadius: 18,
                backgroundColor: colors.sage,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: trail ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.onSage,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Continue
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const stepStyle = {
  width: 34,
  height: 34,
  borderRadius: 11,
  backgroundColor: colors.raised,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function PastPhoto({ stored }: { stored: string }) {
  const [uri, setUri] = useState(stored.startsWith('sb:') ? '' : stored);

  useEffect(() => {
    if (!stored.startsWith('sb:')) {
      setUri(stored);
      return;
    }
    let cancelled = false;
    void resolvePhotoUri(stored).then((next) => {
      if (!cancelled) setUri(next);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (!uri) {
    return (
      <View
        accessibilityLabel="Hike photo"
        style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.raised }}
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      accessibilityLabel="Hike photo"
      style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: colors.raised }}
    />
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: on ? colors.fg : colors.border,
        backgroundColor: on ? colors.fg : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {on ? <Check size={13} strokeWidth={3} color={colors.onSage} /> : null}
      <Text
        style={{
          fontSize: 14,
          color: on ? colors.onSage : colors.fg2,
          fontFamily: on ? fonts.uiSemibold : fonts.ui,
          fontWeight: 'normal',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

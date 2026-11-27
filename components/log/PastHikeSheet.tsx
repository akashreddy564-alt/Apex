import { ChevronRight, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';

import { useColors } from '@/hooks/useColors';
import { useYourTrailStats } from '@/hooks/useYourTrailStats';
import { HikeDetailsFields, type HikeDetails } from '@/components/log/HikeDetailsFields';
import { HikePhotosField } from '@/components/log/HikePhotosField';
import { splitChips } from '@/lib/hikeDetails';
import { Glass } from '@/components/motion';
import { HikeDateField } from '@/components/log/HikeDateField';
import { TrailNameField } from '@/components/log/TrailNameField';
import {
  DISTANCE_UNIT,
  ELEVATION_UNIT,
  formatElevation,
  formatOptionalDistance,
  milesToKm,
  MISSING_METRIC,
} from '@/lib/format';
import { formatHikeDay } from '@/lib/pastHike';
import { DEFAULT_HIKE_TYPE, HIKE_TYPE_LABELS, HIKE_TYPES } from '@/lib/ranking';
import { fonts, numericStyle, type Palette } from '@/theme/tokens';
import type { ElevationSample, Trail } from '@/types/trail';

interface PastHikeSheetProps {
  visible: boolean;
  trails: Trail[];
  trailId: string;
  onTrailId: (id: string) => void;
  onClose: () => void;
  onContinue: (draft: {
    /** Empty when `newTrailName` is set. */
    trailId: string;
    /** A trail the hiker typed that is not in the list yet. */
    newTrailName: string | null;
    hikedOn: Date;
    hours: number;
    minutes: number;
    notes: string;
    distanceKm: number | null;
    /** Metres, from the optional Climb field. */
    elevationGainM: number | null;
    terrain: string[];
    conditions: string[];
    gear: string[];
    companions: string[];
    difficulty: string | null;
    hikeType: string | null;
    photos: string[];
  }) => void;
}

function MiniProfile({ samples }: { samples: ElevationSample[] }) {
  const c = useColors();
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
      <Path d={area} fill={c.accent} fillOpacity={0.12} />
      <Path d={line} stroke={c.accent} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

function stepMinutes(hours: number, minutes: number, delta: number): { hours: number; minutes: number } {
  const total = Math.max(0, hours * 60 + minutes + delta);
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

/** Beli-style past hike sheet. Trail and date are required. Continue is the only accent control. */
export function PastHikeSheet({
  visible,
  trails,
  trailId,
  onTrailId,
  onClose,
  onContinue,
}: PastHikeSheetProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [newTrailName, setNewTrailName] = useState<string | null>(null);
  const picked = trails.find((item) => item.id === trailId) ?? trails[0] ?? null;
  const trail = newTrailName ? null : picked;
  const ready = trail != null || newTrailName != null;
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
  // Terrain and conditions, who you hiked with, and gear (shared with the after-Finish sheet).
  const [details, setDetails] = useState<HikeDetails>({ chips: [], gear: [], companions: [] });
  useEffect(() => {
    if (!visible) setDetails({ chips: [], gear: [], companions: [] });
  }, [visible]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const maximumDate = useMemo(() => new Date(), []);

  // A typed trail is created on Continue; closing the sheet drops it.
  useEffect(() => {
    if (!visible) setNewTrailName(null);
  }, [visible]);

  useEffect(() => {
    if (newTrailName && !distanceTouched) setDistanceText('');
  }, [distanceTouched, newTrailName]);

  // Distance and climb are yours to enter: catalog numbers are guesses for most
  // trails, so nothing is pre-filled from the trail.
  const [climbText, setClimbText] = useState('');
  useEffect(() => {
    if (!visible) setClimbText('');
  }, [visible]);
  const yours = useYourTrailStats(trail?.id ?? '');

  // The fields are in miles and feet; storage stays in kilometres and metres.
  const distanceKm = distanceText.trim() === '' ? null : milesToKm(Number(distanceText));
  const climbM = climbText.trim() === '' ? null : Math.round(Number(climbText) / 3.28084);
  const { terrain, conditions } = splitChips(details.chips);


  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Glass
          intensity={60}
          fill="bg"
          wash={0.82}
          style={{
            flex: 1,
            marginTop: insets.top + 8,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderTopWidth: 1,
            borderTopColor: c.border,
            overflow: 'hidden',
          }}
        >
          <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
            <View
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                backgroundColor: c.borderStrong,
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text
                style={{
                  color: c.fg,
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
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.raised,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} strokeWidth={1.75} color={c.fgMuted} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
          >
            {pickingTrail ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ marginBottom: 12 }}>
                  <TrailNameField
                    trails={trails}
                    onPick={(id) => {
                      onTrailId(id);
                      setNewTrailName(null);
                      setDistanceTouched(false);
                      setTypeTouched(false);
                      setPickingTrail(false);
                    }}
                    onCreate={(name) => {
                      setNewTrailName(name);
                      setDistanceTouched(false);
                      setPickingTrail(false);
                    }}
                  />
                </View>
                {trails.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      onTrailId(item.id);
                      setNewTrailName(null);
                      setDistanceTouched(false);
                      setTypeTouched(false);
                      setPickingTrail(false);
                    }}
                    style={{
                      paddingVertical: 12,
                      borderTopWidth: 1,
                      borderTopColor: c.raised,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: c.fg, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                      {item.name}
                    </Text>
                    <Text style={{ marginTop: 2, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>
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
                    borderTopColor: c.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Trail</Text>
                    <Text style={{ marginTop: 3, fontSize: 16, color: c.fg, fontFamily: fonts.uiSemibold, fontWeight: 'normal' }}>
                      {newTrailName ?? trail?.name ?? 'Choose a trail'}
                    </Text>
                    {newTrailName ? (
                      <Text style={{ marginTop: 2, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>
                        New trail · yours
                      </Text>
                    ) : null}
                    {trail ? (
                      <Text style={{ marginTop: 2, fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>
                        {trail.region} ·{' '}
                        {yours ? (
                          <>
                            <Text style={{ color: c.distance }}>{formatOptionalDistance(yours.distanceKm)}</Text> ·{' '}
                            <Text style={{ color: yours.elevationGainM == null ? c.fgMuted : c.climb }}>
                              {yours.elevationGainM == null ? MISSING_METRIC : `${formatElevation(yours.elevationGainM)} gain`}
                            </Text>
                          </>
                        ) : (
                          'Not hiked yet'
                        )}
                      </Text>
                    ) : null}
                  </View>
                  <MiniProfile samples={trail?.elevation_profile ?? []} />
                  <ChevronRight size={16} strokeWidth={2.2} color={c.fgFaint} />
                </Pressable>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: c.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Date</Text>
                    <Text style={{ marginTop: 3, fontSize: 16, color: c.fg, ...numericStyle('semibold') }}>
                      {formatHikeDay(hikedOn)}
                    </Text>
                  </View>
                  <Pressable accessibilityLabel="Change date" onPress={() => setShowDate((open) => !open)}>
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Change</Text>
                  </Pressable>
                </View>
                {showDate ? (
                  <HikeDateField value={hikedOn} maximumDate={maximumDate} onChange={setHikedOn} />
                ) : null}

                <Text style={{ marginTop: 6, paddingVertical: 6, fontSize: 13, color: c.fgFaint, fontFamily: fonts.ui }}>
                  Optional details
                </Text>

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: c.raised,
                    paddingVertical: 10,
                    flexDirection: 'row',
                    gap: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Time taken</Text>
                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Pressable
                        accessibilityLabel="Decrease time"
                        onPress={() => {
                          const next = stepMinutes(hours, minutes, -5);
                          setHours(next.hours);
                          setMinutes(next.minutes);
                        }}
                        style={stepStyle(c)}
                      >
                        <Text style={{ fontSize: 18, color: c.fg2 }}>−</Text>
                      </Pressable>
                      <Text style={{ fontSize: 20, color: c.fg, ...numericStyle('semibold') }}>
                        {hours}
                        <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.uiMedium }}>h </Text>
                        {String(minutes).padStart(2, '0')}
                        <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.uiMedium }}>m</Text>
                      </Text>
                      <Pressable
                        accessibilityLabel="Increase time"
                        onPress={() => {
                          const next = stepMinutes(hours, minutes, 5);
                          setHours(next.hours);
                          setMinutes(next.minutes);
                        }}
                        style={stepStyle(c)}
                      >
                        <Text style={{ fontSize: 18, color: c.fg2 }}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                  <View style={{ width: 1, backgroundColor: c.raised }} />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Distance</Text>
                      <Text style={{ fontSize: 12, color: c.fgFaint, fontFamily: fonts.ui }}>
                        {distanceText ? 'Yours' : 'Optional'}
                      </Text>
                    </View>
                    <View style={{ marginTop: 6, height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      {editingDistance ? (
                        <TextInput
                          value={distanceText}
                          maxLength={6}
                          onChangeText={(value) => {
                            setDistanceTouched(true);
                            setDistanceText(value.replace(/[^0-9.]/g, ''));
                          }}
                          onBlur={() => setEditingDistance(false)}
                          autoFocus
                          keyboardType="decimal-pad"
                          accessibilityLabel="Distance in miles"
                          style={{ flex: 1, fontSize: 20, color: c.fg, ...numericStyle('semibold') }}
                        />
                      ) : (
                        <Text style={{ fontSize: 20, color: c.fg, ...numericStyle('semibold') }}>
                          {distanceText || MISSING_METRIC}
                          {distanceText ? (
                            <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.uiMedium }}> {DISTANCE_UNIT}</Text>
                          ) : null}
                        </Text>
                      )}
                      <Pressable accessibilityLabel="Edit distance" onPress={() => setEditingDistance(true)}>
                        <Text style={{ fontSize: 13, color: c.fg2, fontFamily: fonts.ui }}>Edit</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: c.raised, paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Climb</Text>
                    <Text style={{ fontSize: 12, color: c.fgFaint, fontFamily: fonts.ui }}>{climbText ? 'Yours' : 'Optional'}</Text>
                  </View>
                  <View style={{ marginTop: 6, height: 34, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TextInput
                      value={climbText}
                      maxLength={5}
                      onChangeText={(value) => setClimbText(value.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                      placeholder={MISSING_METRIC}
                      placeholderTextColor={c.fgFaint}
                      accessibilityLabel="Climb in feet"
                      style={{ flex: 1, fontSize: 20, color: c.climb, ...numericStyle('semibold') }}
                    />
                    <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.uiMedium }}>{ELEVATION_UNIT}</Text>
                  </View>
                </View>

                {HIKE_TYPES.length > 1 ? (
                  <View style={{ borderTopWidth: 1, borderTopColor: c.raised, paddingVertical: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Hike type</Text>
                      <Text style={{ flexShrink: 1, fontSize: 12, color: c.fgFaint, fontFamily: fonts.ui }}>
                        Suggested from distance and gain
                      </Text>
                    </View>
                    <View
                      style={{
                        marginTop: 9,
                        flexDirection: 'row',
                        gap: 3,
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.raised,
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
                              backgroundColor: on ? c.fg : 'transparent',
                              paddingHorizontal: 2,
                            }}
                          >
                            <Text
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              style={{
                                fontSize: 12,
                                color: on ? c.onAccent : c.fgMuted,
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

                <HikeDetailsFields value={details} onChange={setDetails} />

                {/* Difficulty is asked once, in the ranking sheet that follows (Easy to Very strenuous). */}
                <View style={{ borderTopWidth: 1, borderTopColor: c.raised, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 13, color: c.fgMuted, fontFamily: fonts.ui }}>Notes</Text>
                  <TextInput
                    value={notes}
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Snow patches, pace, who you went with"
                    placeholderTextColor={c.fgFaint}
                    accessibilityLabel="Notes"
                    multiline
                    style={{
                      marginTop: 5,
                      minHeight: 44,
                      fontSize: 15,
                      color: c.fg2,
                      fontFamily: fonts.ui,
                    }}
                  />
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: c.raised, paddingVertical: 10 }}>
                  <HikePhotosField photos={photos} onChange={setPhotos} />
                </View>
              </>
            )}
          </ScrollView>

          <Glass
            intensity={60}
            fill="bg"
            wash={0.9}
            style={{
              flex: 0,
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderTopWidth: 1,
              borderTopColor: c.raised,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={!ready}
              onPress={() => {
                if (!ready) return;
                onContinue({
                  trailId: trail?.id ?? '',
                  newTrailName,
                  hikedOn,
                  hours,
                  minutes,
                  notes,
                  distanceKm: distanceKm != null && Number.isFinite(distanceKm) ? distanceKm : null,
                  elevationGainM: climbM != null && Number.isFinite(climbM) ? climbM : null,
                  terrain,
                  conditions,
                  gear: details.gear,
                  companions: details.companions,
                  difficulty: null,
                  hikeType: HIKE_TYPES.length === 1 ? HIKE_TYPES[0] : hikeType,
                  photos,
                });
              }}
              style={{
                height: 56,
                borderRadius: 18,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: ready ? 1 : 0.5,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: c.onAccent,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Continue
              </Text>
            </Pressable>
          </Glass>
        </Glass>
      </View>
    </Modal>
  );
}

const stepStyle = (c: Palette) => ({
  width: 34,
  height: 34,
  borderRadius: 11,
  backgroundColor: c.raised,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
});

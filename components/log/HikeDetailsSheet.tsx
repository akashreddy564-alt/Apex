import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HikeDetailsFields, type HikeDetails } from '@/components/log/HikeDetailsFields';
import { HikePhotosField } from '@/components/log/HikePhotosField';
import { useColors } from '@/hooks/useColors';
import { splitChips } from '@/lib/hikeDetails';
import { pushLog } from '@/lib/remoteSync';
import { useTrailCache } from '@/stores/trailCache';
import { fonts } from '@/theme/tokens';

const EMPTY: HikeDetails = { chips: [], gear: [], companions: [] };

/**
 * After a recorded hike is ranked: photos, terrain and conditions, who you
 * hiked with, and gear. All optional; Skip closes it. Saves onto the hike and
 * syncs (tagged people are notified once it's posted).
 */
export function HikeDetailsSheet({ logId, onClose }: { logId: string | null; onClose: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const log = useTrailCache((s) => (logId ? s.logs.find((l) => l.id === logId) ?? null : null));
  const [value, setValue] = useState<HikeDetails>(EMPTY);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!log) return;
    setValue({
      chips: [...(log.terrain ?? []), ...(log.conditions ?? [])],
      gear: log.gear ?? [],
      companions: log.companions ?? [],
    });
    setPhotos(log.photos ?? []);
    // Only when a different hike opens; edits stay local until Save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logId]);

  const save = () => {
    if (log) {
      const { terrain, conditions } = splitChips(value.chips);
      const patch = { terrain, conditions, gear: value.gear, companions: value.companions, photos };
      useTrailCache.getState().updateLog(log.id, patch);
      void pushLog({ ...log, ...patch });
    }
    onClose();
  };

  return (
    <Modal visible={logId != null && log != null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: c.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 18,
            paddingBottom: insets.bottom + 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
            <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 24, lineHeight: 28 }} accessibilityRole="header">
              Hike details
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Skip hike details" onPress={onClose} hitSlop={10}>
              <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>Skip</Text>
            </Pressable>
          </View>
          <Text style={{ paddingHorizontal: 20, marginTop: 4, color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>
            Optional. Shows on your post.
          </Text>
          <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            <View style={{ paddingVertical: 10 }}>
              <HikePhotosField photos={photos} onChange={setPhotos} />
            </View>
            <HikeDetailsFields value={value} onChange={setValue} />
          </ScrollView>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Save hike details" onPress={save}>
              <View style={{ height: 54, borderRadius: 18, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.onAccent, fontFamily: fonts.uiSemibold, fontSize: 16 }}>Save</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

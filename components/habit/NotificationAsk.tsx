import { BellRing, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { askForFullAccess, askSnoozed, notificationAccess, snoozeAsk, supported } from '@/lib/nudgeScheduler';
import { useTrailCache } from '@/stores/trailCache';
import { fonts } from '@/theme/tokens';

/**
 * Asks for full notifications in context, after the first hike, and says
 * exactly what they'll get. Never on first launch, and never twice in three
 * weeks. Until then iOS delivers reminders quietly (provisional access).
 */
export function NotificationAsk() {
  const c = useColors();
  const hasHike = useTrailCache((s) => s.logs.length > 0);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported || !hasHike) return;
    let cancelled = false;
    void Promise.all([notificationAccess(), askSnoozed()]).then(([access, snoozed]) => {
      if (!cancelled) setShow(!snoozed && (access === 'undecided' || access === 'quiet'));
    });
    return () => {
      cancelled = true;
    };
  }, [hasHike]);

  if (!show) return null;

  const turnOn = async () => {
    setBusy(true);
    const access = await askForFullAccess();
    setBusy(false);
    // Already said no to the system prompt: only Settings can change it now.
    if (access === 'denied') void Linking.openSettings();
    setShow(access !== 'full');
    if (access !== 'full') void snoozeAsk();
  };

  const dismiss = () => {
    setShow(false);
    void snoozeAsk();
  };

  return (
    <View className="mt-4 rounded-2xl bg-surface px-4 pb-4 pt-4">
      <View className="flex-row items-start gap-3">
        <BellRing size={20} strokeWidth={1.7} color={c.accent} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>Know when the weekend looks good</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 4 }}>
            A heads-up on Thursday when it’s dry where you hike, and before your streak runs out. A few a week at
            most.
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Not now" onPress={dismiss} hitSlop={12}>
          <X size={18} strokeWidth={1.7} color={c.fgFaint} />
        </Pressable>
      </View>
      <View className="mt-4">
        <PrimaryButton compact label="Turn on" busy={busy} onPress={() => void turnOn()} />
      </View>
    </View>
  );
}

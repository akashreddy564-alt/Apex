import { Circle, Shield, Square } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';

import { colors, fonts } from '@/theme/tokens';

function Row({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <View className="flex-row gap-3.5 border-t border-zinc-800 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        {icon}
      </View>
      <View className="flex-1">
        <Text style={{ color: colors.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }}>{title}</Text>
        <Text style={{ color: colors.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 3 }}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

interface LocationExplainerProps {
  onContinue: () => void;
  onDismiss: () => void;
}

/**
 * Shown once, before any system location prompt.
 * Continue is what asks for While Using. A later Always prompt, if iOS shows
 * one for locked-screen recording, only happens after this screen.
 * Not now returns to the log sheet.
 */
export function LocationExplainer({ onContinue, onDismiss }: LocationExplainerProps) {
  const insets = useSafeAreaInsets();
  const android = Platform.OS === 'android';

  return (
    <View className="flex-1 bg-zinc-950" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-1 px-6">
        <View className="mt-2 h-28 w-36 items-center justify-center self-center rounded-3xl border border-zinc-800 bg-zinc-950">
          <Svg width={118} height={80} viewBox="0 0 118 80">
            <Path
              d="M12 58 C 28 58, 28 28, 48 28 S 78 62, 104 18"
              stroke={colors.sage}
              strokeWidth={2.4}
              fill="none"
              strokeLinecap="round"
            />
            <SvgCircle cx={12} cy={58} r={4} stroke={colors.sage} strokeWidth={1.6} fill="none" />
            <SvgCircle cx={104} cy={18} r={3.5} fill={colors.fg} />
          </Svg>
        </View>
        <Text
          style={{
            color: colors.fg,
            fontFamily: fonts.displayExtraBold,
            fontSize: 30,
            lineHeight: 34,
            marginTop: 18,
          }}
        >
          Record your route with the screen off
        </Text>
        <Text style={{ color: colors.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 12 }}>
          To draw your track and count distance and elevation, Apex needs your location while you
          record, including when your phone is locked in a pocket.
        </Text>
        {android ? (
          <Text style={{ color: colors.fg2, fontFamily: fonts.ui, fontSize: 15, lineHeight: 22, marginTop: 8 }}>
            While recording, Android shows a notification, Apex is recording your hike, with Pause
            and Finish. It disappears when the hike ends.
          </Text>
        ) : null}
        <View className="mt-3">
          <Row
            icon={<Circle size={16} color={colors.fg} strokeWidth={1.75} />}
            title="Only during a hike you start"
            detail="Recording begins when you tap Record and ends when you tap Finish."
          />
          <Row
            icon={<Shield size={16} color={colors.fg} strokeWidth={1.75} />}
            title="Never tracked otherwise"
            detail="No location in the background at any other time."
          />
          <View className="border-b border-zinc-800">
            <Row
              icon={<Square size={16} color={colors.fg} strokeWidth={1.75} />}
              title="Stop any time"
              detail="Pause or finish whenever you like, or turn location off in Settings."
            />
          </View>
        </View>
      </View>
      <View className="px-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <Text
          style={{
            color: colors.fgMuted,
            fontFamily: fonts.ui,
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 18,
            marginBottom: 12,
          }}
        >
          {android
            ? 'Android will ask next. While using the app is enough.'
            : 'iOS will ask next. “Allow While Using App” is enough.'}
        </Text>
        <Pressable
          accessibilityLabel="Continue and allow location while using Apex"
          onPress={onContinue}
          className="items-center py-4"
          style={{ borderRadius: 18, backgroundColor: colors.sage }}
        >
          <Text style={{ color: colors.onSage, fontFamily: fonts.uiSemibold, fontSize: 16 }}>
            Continue
          </Text>
        </Pressable>
        <Pressable accessibilityLabel="Not now" onPress={onDismiss} className="items-center py-3">
          <Text style={{ color: colors.fg2, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

import { Pressable, Text, View } from 'react-native';

import { GrowBar, haptics } from '@/components/motion';
import { Avatar } from '@/components/social/Avatar';
import { useColors } from '@/hooks/useColors';
import { formatElevation } from '@/lib/format';
import { PERIODS, type BoardRow, type Period } from '@/lib/groupRules';
import { withAlpha } from '@/theme/color';
import { fonts, numericStyle } from '@/theme/tokens';

const PERIOD_NAMES: Record<Period, string> = { week: 'Week', month: 'Month', year: 'Year' };

/** Week, month and year tabs over a board. */
export function PeriodSwitch({ period, onChange }: { period: Period; onChange: (p: Period) => void }) {
  const c = useColors();
  return (
    <View className="flex-row rounded-xl bg-surface p-1" accessibilityRole="tablist">
      {PERIODS.map((option) => {
        const on = option === period;
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.select();
              onChange(option);
            }}
            className={`flex-1 items-center rounded-lg py-2 ${on ? 'bg-fg' : ''}`}
          >
            <Text style={{ color: on ? c.bg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 13 }}>
              {PERIOD_NAMES[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * People by elevation gain: place, avatar, name, climb and a bar. Groups,
 * friends and schools or companies all use it.
 */
export function Leaderboard({
  rows,
  title = 'Elevation',
  footnote,
  onPressRow,
  onLongPressRow,
  longPressHint,
}: {
  rows: BoardRow[];
  title?: string | null;
  footnote?: string;
  onPressRow?: (row: BoardRow) => void;
  onLongPressRow?: (row: BoardRow) => void;
  longPressHint?: (row: BoardRow) => string | undefined;
}) {
  const c = useColors();
  const top = Math.max(1, ...rows.map((row) => row.gainM));
  return (
    <View>
      {title ? <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>{title}</Text> : null}
      <View className={title ? 'mt-2' : ''}>
        {rows.map((row, index) => (
          <Pressable
            key={row.userId}
            accessibilityLabel={`${row.place}. ${row.isMe ? 'You' : row.displayName}, ${formatElevation(row.gainM)}`}
            accessibilityHint={longPressHint?.(row)}
            accessibilityRole={onPressRow && !row.isMe ? 'button' : undefined}
            onPress={onPressRow && !row.isMe ? () => onPressRow(row) : undefined}
            onLongPress={onLongPressRow ? () => onLongPressRow(row) : undefined}
            className="flex-row items-center gap-3 py-2 active:opacity-80"
          >
            <Text style={{ ...numericStyle('semibold'), width: 22, color: c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
              {row.place}
            </Text>
            <Avatar name={row.displayName} size={34} />
            <View className="flex-1">
              <View className="flex-row items-baseline justify-between gap-2">
                <Text numberOfLines={1} style={{ flexShrink: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
                  {row.isMe ? 'You' : row.displayName}
                </Text>
                <Text style={{ ...numericStyle('semibold'), color: c.climb, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
                  {formatElevation(row.gainM)}
                </Text>
              </View>
              <View className="mt-1.5">
                <GrowBar fraction={row.gainM / top} index={index} color={row.isMe ? c.climb : withAlpha(c.climb, 0.4)} track={c.raised} />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      {footnote ? (
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 }}>{footnote}</Text>
      ) : null}
    </View>
  );
}

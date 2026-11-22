import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { ScoreBadge } from '@/components/score/ScoreBadge';
import { TrailCard } from '@/components/trail/TrailCard';
import { withAlpha } from '@/theme/color';
import { useColors } from '@/hooks/useColors';
import { useRankings } from '@/hooks/useRankings';
import { rankReason } from '@/lib/reasons';
import { SHORT_LABELS } from '@/lib/scoreBadge';
import { fonts } from '@/theme/tokens';

interface RankingsListProps {
  onOpenTrail: (trailId: string) => void;
}

/** Your trails in order, grouped Loved, Fine, Nope. */
export function RankingsList({ onOpenTrail }: RankingsListProps) {
  const c = useColors();
  const { sections } = useRankings();
  // Neighbours by the order shown: Loved, then Fine, then Nope, best first.
  const reasons = useMemo(() => {
    const order = sections.flatMap((section) => section.entries.map((entry) => entry.trail));
    return new Map(
      order.map((trail, i) => [trail.id, rankReason(order[i + 1]?.name ?? null, order[i - 1]?.name ?? null)]),
    );
  }, [sections]);

  if (sections.length === 0) {
    return (
      <View className="px-4 py-16">
        <Text className="text-center text-[15px] text-fg-2">No ranked hikes yet.</Text>
        <Text className="mt-2 text-center text-[13px] text-fg-muted">
          Finish a hike to place it.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {sections.map((section) => (
        <View key={section.bucket}>
          {/* Each bucket reads as its own band of the scorecard, in its score color. */}
          <View
            className="mt-4 flex-row items-baseline justify-between px-4 py-2"
            style={{
              backgroundColor: withAlpha(c[section.bucket], 0.1),
              borderLeftWidth: 3,
              borderLeftColor: c[section.bucket],
            }}
          >
            <Text
              style={{
                color: c[section.bucket],
                fontFamily: fonts.uiSemibold,
                fontSize: 12,
                letterSpacing: 0.9,
                textTransform: 'uppercase',
              }}
            >
              {SHORT_LABELS[section.bucket]}
            </Text>
            <Text className="text-[11px] text-fg-faint">
              {section.count} {section.count === 1 ? 'hike' : 'hikes'}
            </Text>
          </View>
          {section.entries.map((entry) => (
            <TrailCard
              key={entry.trail.id}
              trail={entry.trail}
              rank={entry.ordinal}
              rankColor={c[section.bucket]}
              reason={reasons.get(entry.trail.id) ?? null}
              trailing={
                <ScoreBadge bucket={section.bucket} count={section.count} score={entry.score} size="sm" />
              }
              onPress={() => onOpenTrail(entry.trail.id)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

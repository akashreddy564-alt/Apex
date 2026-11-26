import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { supabase } from '@/lib/supabase';
import { cardStyle, fonts } from '@/theme/tokens';

interface Report {
  chip: string;
  kind: 'terrain' | 'conditions';
  hikers: number;
}

/** What hikers reported on this trail in the last year (counts only). Hidden until someone has. */
export function TrailConditions({ trailId }: { trailId: string }) {
  const c = useColors();
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const { data } = useQuery({
    queryKey: ['trailConditions', uid, trailId],
    enabled: uid !== null && supabase !== null,
    queryFn: async (): Promise<Report[]> => {
      const { data: rows, error } = await supabase!.rpc('trail_conditions', { trail: trailId });
      if (error) throw error;
      return (Array.isArray(rows) ? rows : []).flatMap((row: Record<string, unknown>) =>
        typeof row.chip === 'string' && (row.kind === 'terrain' || row.kind === 'conditions')
          ? [{ chip: row.chip, kind: row.kind, hikers: Number(row.hikers) || 0 }]
          : [],
      );
    },
  });
  const reports = data ?? [];
  if (reports.length === 0) return null;
  return (
    <View style={[cardStyle(c), { marginTop: 12 }]}>
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16 }} accessibilityRole="header">
        What hikers report
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {reports.map((r) => (
          <View
            key={`${r.kind}:${r.chip}`}
            accessibilityLabel={`${r.chip}, reported by ${r.hikers} ${r.hikers === 1 ? 'hiker' : 'hikers'}`}
            style={{ flexDirection: 'row', gap: 5, borderRadius: 999, backgroundColor: c.raised, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: c.fg, fontFamily: fonts.uiMedium, fontSize: 13 }}>{r.chip}</Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>{r.hikers}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

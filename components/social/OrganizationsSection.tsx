import { useRouter } from 'expo-router';
import { BadgeCheck, ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Eyebrow, Skeleton } from '@/components/motion';
import { SecondaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { useMyOrganizations } from '@/hooks/useOrganizations';
import { ordinal } from '@/lib/groupRules';
import { ORG_CAP_PER_PERSON, renewNote, type Organization } from '@/lib/organizations';
import { cardStyle, fonts } from '@/theme/tokens';

function OrgRow({ org, first }: { org: Organization; first: boolean }) {
  const c = useColors();
  const router = useRouter();
  const place = org.place != null && org.weekGainM > 0 ? `${ordinal(org.place)} this week` : 'No climbs yet this week';
  const renew = renewNote(org.verifiedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${org.name}, verified ${org.domain}, ${place}`}
      onPress={() => router.push({ pathname: '/org/[id]', params: { id: org.id } })}
      className={`flex-row items-center gap-3 py-2.5 active:opacity-80 ${first ? '' : 'border-t border-raised'}`}
    >
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text numberOfLines={1} style={{ flexShrink: 1, color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 15 }}>
            {org.name}
          </Text>
          <BadgeCheck size={15} strokeWidth={2} color={c.loved} />
        </View>
        <Text style={{ color: renew ? c.climb : c.fgMuted, fontFamily: fonts.ui, fontSize: 13 }}>
          {renew ? 'Verify again to stay on the board' : `${place} · ${org.memberCount} ${org.memberCount === 1 ? 'person' : 'people'}`}
        </Text>
      </View>
      <ChevronRight size={18} strokeWidth={1.6} color={c.fgFaint} />
    </Pressable>
  );
}

/** Social's schools and companies: verified boards, then Verify. */
export function OrganizationsSection() {
  const c = useColors();
  const router = useRouter();
  const { organizations, loading, error, refetch } = useMyOrganizations();
  const full = organizations.length >= ORG_CAP_PER_PERSON;
  return (
    <View className="mx-4 mt-8">
      <View style={cardStyle(c)}>
        <Eyebrow>Verified</Eyebrow>
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18, marginTop: 6 }}>School and work</Text>
        {error ? (
          <View className="mt-3 gap-2">
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14 }}>{error}</Text>
            <SecondaryButton compact label="Try again" onPress={() => void refetch()} />
          </View>
        ) : null}
        {!loading && !error && organizations.length === 0 ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
            Verify your school or work email to join its board. Only people with an email there can get on it.
          </Text>
        ) : null}
        {loading && organizations.length === 0 ? (
          <View className="mt-2">
            <Skeleton shape="row" count={1} />
          </View>
        ) : null}
        <View className="mt-2">
          {organizations.map((org, i) => (
            <OrgRow key={org.id} org={org} first={i === 0} />
          ))}
        </View>
      </View>
      {!full ? (
        <View className="mt-3">
          <SecondaryButton label="Verify school or work email" onPress={() => router.push('/verify-org')} />
        </View>
      ) : null}
    </View>
  );
}

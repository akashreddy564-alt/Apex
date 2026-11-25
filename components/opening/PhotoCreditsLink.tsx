import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Linking, Pressable, Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { openLegal } from '@/components/social/TermsAgreement';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_MAILTO, SUPPORT_URL, TERMS_URL } from '@/lib/legal';
import { useColors } from '@/hooks/useColors';
import { cardStyle, fonts } from '@/theme/tokens';

const LEGAL = [
  { label: 'Support', detail: 'Questions, bugs and account help', open: () => openLegal(SUPPORT_URL) },
  { label: 'Email support', detail: SUPPORT_EMAIL, open: () => void Linking.openURL(SUPPORT_MAILTO).catch(() => {}) },
  { label: 'Privacy Policy', detail: 'What Apex keeps and who sees it', open: () => openLegal(PRIVACY_URL) },
  { label: 'Terms', detail: 'The rules for what you share', open: () => openLegal(TERMS_URL) },
];

/** Settings' last card: support (site and email), the legal pages, and credits. */
export function PhotoCreditsLink() {
  const router = useRouter();
  const c = useColors();
  return (
    <View style={[cardStyle(c), { paddingBottom: 6 }]}>
      <Eyebrow>About</Eyebrow>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Credits"
        onPress={() => router.push('/credits')}
        className="mt-2 flex-row items-center justify-between py-3 active:opacity-70"
      >
        <View className="flex-1">
          <Text style={{ color: c.fg, fontFamily: fonts.ui, fontSize: 15 }}>Credits</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>
            Trail data and opening-screen photos
          </Text>
        </View>
        <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
      </Pressable>
      {LEGAL.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="link"
          accessibilityLabel={item.label}
          onPress={item.open}
          className="flex-row items-center justify-between border-t border-raised py-3 active:opacity-70"
        >
          <View className="flex-1">
            <Text style={{ color: c.fg, fontFamily: fonts.ui, fontSize: 15 }}>{item.label}</Text>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, marginTop: 2 }}>{item.detail}</Text>
          </View>
          <ChevronRight size={18} strokeWidth={1.6} color={c.fgMuted} />
        </Pressable>
      ))}
    </View>
  );
}

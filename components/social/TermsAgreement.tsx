import { Check } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { PRIVACY_URL, TERMS_SUMMARY, TERMS_URL } from '@/lib/legal';
import { fonts } from '@/theme/tokens';

export function openLegal(url: string) {
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

function LegalLink({ label, url }: { label: string; url: string }) {
  const c = useColors();
  return (
    <Text
      accessibilityRole="link"
      onPress={() => openLegal(url)}
      style={{ color: c.fg, fontFamily: fonts.uiSemibold, textDecorationLine: 'underline' }}
    >
      {label}
    </Text>
  );
}

/** The rules in one line, with links to the full terms and privacy policy. */
export function TermsSummary() {
  const c = useColors();
  return (
    <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 13, lineHeight: 19 }}>
      {TERMS_SUMMARY} Read the <LegalLink label="Terms" url={TERMS_URL} /> and{' '}
      <LegalLink label="Privacy Policy" url={PRIVACY_URL} />.
    </Text>
  );
}

/** A checkbox: "I agree to the Terms", with the rules underneath. */
export function TermsCheckbox({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  const c = useColors();
  return (
    <View className="flex-row gap-3">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="I agree to Apex’s Terms and Privacy Policy"
        hitSlop={8}
        onPress={() => {
          haptics.select();
          onChange(!checked);
        }}
        className="mt-0.5 items-center justify-center rounded-md"
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: checked ? c.fg : c.fgFaint,
          backgroundColor: checked ? c.fg : 'transparent',
        }}
      >
        {checked ? <Check size={14} strokeWidth={2.6} color={c.bg} /> : null}
      </Pressable>
      <View className="flex-1">
        <Text
          onPress={() => onChange(!checked)}
          style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 14, lineHeight: 20 }}
        >
          I agree to the Terms and Privacy Policy
        </Text>
        <View className="mt-1">
          <TermsSummary />
        </View>
      </View>
    </View>
  );
}

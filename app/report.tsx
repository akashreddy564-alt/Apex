import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useSafetyActions } from '@/hooks/useSafety';
import { REPORT_DETAILS_MAX, REPORT_REASONS, type ReportReason } from '@/lib/safetyRules';
import { fonts } from '@/theme/tokens';

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined;

function ReportForm() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ person?: string; name?: string; post?: string; comment?: string }>();
  const person = one(params.person);
  const name = one(params.name) ?? 'this person';
  const post = one(params.post);
  const comment = one(params.comment);
  const { report, reporting, block } = useSafetyActions();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const what = comment ? `${name}’s comment` : post ? `${name}’s hike` : name;

  const submit = async () => {
    if (!person || !reason) return;
    setError(null);
    try {
      await report({ person, reason, details, post, comment });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Thanks for telling us', 'We review every report within 24 hours. Want to block them too?', [
        { text: 'Not now', style: 'cancel', onPress: () => router.back() },
        { text: 'Block', style: 'destructive', onPress: () => void block(person).then(() => router.back()) },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t send the report.');
    }
  };

  if (!person) {
    return <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15 }}>Nothing to report here.</Text>;
  }

  return (
    <View>
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 20 }}>What’s wrong with {what}?</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 6 }}>
        Only the Apex team sees reports. {name.split(/\s+/)[0]} isn’t told who sent it.
      </Text>
      <View className="mt-5" accessibilityRole="radiogroup">
        {REPORT_REASONS.map((option) => {
          const on = option.value === reason;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                void Haptics.selectionAsync();
                setReason(option.value);
              }}
              className="flex-row items-center justify-between border-b border-raised py-3.5 active:opacity-70"
            >
              <Text style={{ color: c.fg, fontFamily: on ? fonts.uiSemibold : fonts.ui, fontSize: 16 }}>{option.label}</Text>
              {on ? <Check size={18} strokeWidth={2.2} color={c.fg} /> : null}
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={details}
        onChangeText={setDetails}
        maxLength={REPORT_DETAILS_MAX}
        multiline
        placeholder="Anything else we should know (optional)"
        placeholderTextColor={c.fgFaint}
        accessibilityLabel="Details"
        className="mt-5 rounded-xl border border-raised bg-surface px-3 py-3"
        style={{ color: c.fg, fontFamily: fonts.ui, fontSize: 15, minHeight: 88, textAlignVertical: 'top' }}
      />
      {error ? (
        <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 14, marginTop: 12 }}>{error}</Text>
      ) : null}
      <View className="mt-6">
        <PrimaryButton label="Send report" onPress={() => void submit()} disabled={!reason} busy={reporting} />
      </View>
    </View>
  );
}

export default function ReportScreen() {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SignInGate why="send a report">{() => <ReportForm />}</SignInGate>
    </ScrollView>
  );
}

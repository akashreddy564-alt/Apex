import { useFocusEffect } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { haptics } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { answerStreak, dayNumber, questionForDay, rightCount, shuffledAnswers } from '@/lib/trailIq';
import { useTrailIqStore } from '@/stores/trailIqStore';
import { withAlpha } from '@/theme/color';
import { cardStyle, fonts } from '@/theme/tokens';

/** Trail IQ: today's hiking question. Tap an answer to see if you're right, and why. */
export function TrailIqCard() {
  const c = useColors();
  const [visit, setVisit] = useState(0);
  useFocusEffect(useCallback(() => setVisit((n) => n + 1), []));
  const day = useMemo(() => dayNumber(new Date()), [visit]); // eslint-disable-line react-hooks/exhaustive-deps
  const question = questionForDay(day);
  const { answers, correct } = useMemo(() => shuffledAnswers(question, day), [question, day]);
  const picks = useTrailIqStore((s) => s.picks);
  const right = useTrailIqStore((s) => s.right);
  const answer = useTrailIqStore((s) => s.answer);
  const picked = picks[String(day)];
  const answered = picked !== undefined;
  const streak = answerStreak({ picks, right }, day);
  const total = rightCount({ picks, right });

  const pick = (index: number) => {
    if (answered) return;
    const isRight = index === correct;
    if (isRight) haptics.success();
    else haptics.tapMedium();
    answer(day, index, isRight);
  };

  const label = { color: c.fgMuted, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 } as const;

  return (
    <View style={[cardStyle(c), { marginHorizontal: 16, marginTop: 14 }]} accessibilityLabel="Trail IQ, today’s hiking question">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[label, { flex: 1 }]}>TRAIL IQ</Text>
        {streak > 0 ? <Text style={[label, { color: c.streak }]}>{streak} DAY{streak === 1 ? '' : 'S'} IN A ROW</Text> : null}
      </View>
      <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 16, lineHeight: 22, marginTop: 8 }}>
        {question.question}
      </Text>
      <View style={{ marginTop: 10, gap: 8 }}>
        {answers.map((text, index) => {
          const isRight = index === correct;
          const isPicked = picked === index;
          const show = answered && (isRight || isPicked);
          const tone = isRight ? c.streak : c.disliked;
          return (
            <Pressable
              key={text}
              accessibilityRole="button"
              accessibilityLabel={answered ? `${text}${isRight ? ', right answer' : isPicked ? ', your answer, wrong' : ''}` : text}
              accessibilityState={{ disabled: answered, selected: isPicked }}
              disabled={answered}
              onPress={() => pick(index)}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <View
                style={{
                  minHeight: 44,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: show ? tone : c.raised,
                  backgroundColor: show ? withAlpha(tone, 0.13) : 'transparent',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  opacity: answered && !show ? 0.55 : 1,
                }}
              >
                <Text style={{ flex: 1, color: c.fg, fontFamily: fonts.uiMedium, fontSize: 14, lineHeight: 19 }}>{text}</Text>
                {show ? (
                  isRight ? <Check size={16} strokeWidth={2.4} color={tone} /> : <X size={16} strokeWidth={2.4} color={tone} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {answered ? (
        <Animated.View entering={FadeIn.duration(220)}>
          <Text style={{ color: picked === correct ? c.streak : c.fg2, fontFamily: fonts.uiSemibold, fontSize: 14, marginTop: 12 }}>
            {picked === correct ? 'Right.' : 'Not quite.'}
          </Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginTop: 2 }}>{question.why}</Text>
          <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 12, marginTop: 8 }}>
            {total} right so far · New question tomorrow
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

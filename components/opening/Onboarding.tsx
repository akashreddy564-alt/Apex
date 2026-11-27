import { Check, Mountain } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  FadeOut,
  FadeOutLeft,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ring } from '@/components/habit/GoalRing';
import { ContourTexture, haptics, PressScale } from '@/components/motion';
import { EmailSignIn } from '@/components/social/EmailSignIn';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { Segmented } from '@/components/social/Segmented';
import { SignInOptions } from '@/components/social/SignInOptions';
import { useColors } from '@/hooks/useColors';
import { useMyProfile } from '@/hooks/useProfile';
import {
  DISTANCE_BANDS,
  INTERESTS,
  ONBOARDING_STEPS,
  suggestedGoal,
  toggleInterest,
  type DistanceBand,
} from '@/lib/onboarding';
import { GOAL_PRESETS, toStored, type GoalMetric } from '@/lib/weeklyGoal';
import { useGoal } from '@/stores/goalStore';
import { useOnboarding } from '@/stores/onboardingStore';
import { withAlpha } from '@/theme/color';
import { displayXL, fonts, numericStyle } from '@/theme/tokens';

const HEADER_H = 220;

/** One thin bar per step; the current one fills as you arrive. */
function Progress({ index }: { index: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 6, flex: 1 }} accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}>
      {ONBOARDING_STEPS.map((step, i) => (
        <Segment key={step} done={i <= index} color={c.fg} track={c.raised} />
      ))}
    </View>
  );
}

function Segment({ done, color, track }: { done: boolean; color: string; track: string }) {
  const reduceMotion = useReducedMotion();
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: withTiming(done ? 1 : 0, { duration: reduceMotion ? 0 : 420, easing: Easing.out(Easing.cubic) }) }],
  }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: color, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

function Title({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const c = useColors();
  return (
    <View>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.4 }}>{eyebrow}</Text>
      <Text accessibilityRole="header" style={{ ...displayXL, color: c.fg, marginTop: 10 }}>
        {title}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 16, lineHeight: 23, marginTop: 10 }}>{body}</Text>
    </View>
  );
}

/** A big choice card: the whole card is the target, with a check when picked. */
function ChoiceCard({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressScale
      to={0.98}
      haptic={false}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${hint}`}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: selected ? c.fg : c.raised,
        backgroundColor: selected ? c.surface : withAlpha(c.surface, 0.6),
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 18 }}>{label}</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 3 }}>{hint}</Text>
      </View>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: selected ? 0 : 1.5,
          borderColor: c.borderStrong,
          backgroundColor: selected ? c.fg : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? (
          <Animated.View entering={FadeIn.duration(140)}>
            <Check size={16} strokeWidth={2.6} color={c.bg} />
          </Animated.View>
        ) : null}
      </View>
    </PressScale>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <PressScale
      to={0.94}
      haptic={false}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: selected ? c.fg : c.raised,
        backgroundColor: selected ? c.fg : c.surface,
        paddingHorizontal: 16,
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: selected ? c.bg : c.fg2, fontFamily: fonts.uiMedium, fontSize: 15 }}>{label}</Text>
    </PressScale>
  );
}

function DistanceStep() {
  const band = useOnboarding((s) => s.band);
  const setBand = useOnboarding((s) => s.setBand);
  return (
    <View style={{ gap: 28 }}>
      <Title eyebrow="ABOUT YOU" title="How far do you usually hike?" body="Apex sizes your weekly goal and picks from this." />
      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {DISTANCE_BANDS.map((b) => (
          <ChoiceCard key={b.value} label={b.label} hint={b.hint} selected={band === b.value} onPress={() => setBand(b.value as DistanceBand)} />
        ))}
      </View>
    </View>
  );
}

function GoalStep() {
  const c = useColors();
  const band = useOnboarding((s) => s.band);
  const metric = useGoal((s) => s.metric);
  const setMetric = useGoal((s) => s.setMetric);
  const setTarget = useGoal((s) => s.setTarget);
  const [display, setDisplay] = useState(() => suggestedGoal(band, metric));
  const presets = GOAL_PRESETS[metric];
  const unit = metric === 'distance' ? 'mi' : 'ft';

  const choose = (next: number, on: GoalMetric = metric) => {
    setDisplay(next);
    setTarget(toStored(on, next));
  };
  // Save the suggestion straight away, so Continue keeps it.
  useEffect(() => {
    choose(suggestedGoal(band, metric));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  const max = presets[presets.length - 1];
  return (
    <View style={{ gap: 24 }}>
      <Title eyebrow="WEEKLY GOAL" title="Set a goal for the week" body="A ring on Home fills as you hike. Change it any time." />
      <Segmented
        options={[
          { value: 'distance', label: 'Distance' },
          { value: 'elevation', label: 'Climb' },
        ]}
        value={metric}
        onChange={(next) => {
          haptics.select();
          setMetric(next);
        }}
      />
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 150 }}>
        <Ring fraction={Math.max(0.12, display / max)} size={150} stroke={12} complete={false} color={metric === 'distance' ? c.distance : c.climb} />
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: c.fg, fontSize: 34, lineHeight: 38, ...numericStyle('semibold') }}>{display.toLocaleString('en-US')}</Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 13 }}>{unit} a week</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {presets.map((p) => (
          <Chip key={p} label={`${p.toLocaleString('en-US')} ${unit}`} selected={p === display} onPress={() => choose(p)} />
        ))}
      </View>
    </View>
  );
}

function InterestsStep() {
  const interests = useOnboarding((s) => s.interests);
  const setInterests = useOnboarding((s) => s.setInterests);
  return (
    <View style={{ gap: 28 }}>
      <Title eyebrow="WHAT YOU LOVE" title="What do you hike for?" body="Pick a few. Trail picks lean toward them." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {INTERESTS.map((item) => (
          <Chip key={item} label={item} selected={interests.includes(item)} onPress={() => setInterests(toggleInterest(interests, item))} />
        ))}
      </View>
    </View>
  );
}

function AccountStep() {
  return (
    <View style={{ gap: 8 }}>
      <Title
        eyebrow="ACCOUNT"
        title="Save your hikes"
        body="Sign in to back up your hikes and hike with friends. Logging works without it."
      />
      <SignInOptions email={<EmailSignIn />} />
    </View>
  );
}

/**
 * First launch: three quick questions, then sign-up (skippable), before the
 * Apex intro plays. Every step has a way out; nothing here blocks the app.
 */
export function Onboarding({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const band = useOnboarding((s) => s.band);
  const interests = useOnboarding((s) => s.interests);
  const markSeen = useOnboarding((s) => s.markSeen);
  const { session } = useMyProfile();
  const step = ONBOARDING_STEPS[index];
  const scroll = useRef<ScrollView>(null);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    markSeen();
    onDone();
  };

  // Reaching sign-up counts as seen: a cold start from the email link won't replay this.
  useEffect(() => {
    if (step === 'account') markSeen();
  }, [markSeen, step]);

  // Signed in on the last step (Apple, Google, code, or the link coming back): move on.
  useEffect(() => {
    if (step === 'account' && session) {
      haptics.success();
      const t = setTimeout(finish, 450);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, step]);

  const next = () => {
    if (index < ONBOARDING_STEPS.length - 1) {
      setIndex(index + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
    } else finish();
  };
  const back = () => index > 0 && setIndex(index - 1);

  const canContinue = step !== 'distance' || band !== null;
  const entering = reduceMotion ? FadeIn.duration(1) : FadeInRight.duration(340).easing(Easing.out(Easing.cubic)).withInitialValues({ transform: [{ translateX: 28 }] });
  const exiting = reduceMotion ? FadeOut.duration(1) : FadeOutLeft.duration(200);

  return (
    <Animated.View
      // Fades away to the splash-colored first frame of the Apex intro underneath.
      exiting={reduceMotion ? undefined : FadeOut.duration(320)}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.bg, zIndex: 50 }}
    >
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H + insets.top }}>
        <ContourTexture seed="onboarding" width={width} height={HEADER_H + insets.top} opacity={0.55} color={withAlpha(c.climb, 0.3)} />
      </View>

      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 44 + insets.top }}>
        {index > 0 ? (
          <PressScale to={0.9} accessibilityRole="button" accessibilityLabel="Back" onPress={back} hitSlop={10} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>Back</Text>
          </PressScale>
        ) : (
          <View style={{ width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Mountain size={22} strokeWidth={1.8} color={c.fg} />
          </View>
        )}
        <Progress index={index} />
        {step === 'account' ? (
          // "Not now" at the bottom is the way out here; one exit, not two.
          <View style={{ width: 44 }} />
        ) : (
          <PressScale
            to={0.9}
            accessibilityRole="button"
            accessibilityLabel="Skip to sign in"
            onPress={() => setIndex(ONBOARDING_STEPS.length - 1)}
            hitSlop={10}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          >
            <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 15 }}>Skip</Text>
          </PressScale>
        )}
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 36, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step} entering={entering} exiting={exiting}>
          {step === 'distance' ? <DistanceStep /> : null}
          {step === 'goal' ? <GoalStep /> : null}
          {step === 'interests' ? <InterestsStep /> : null}
          {step === 'account' ? <AccountStep /> : null}
        </Animated.View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 16 }}>
        {step === 'account' ? (
          <SecondaryButton label="Not now" onPress={finish} />
        ) : (
          <PrimaryButton label={step === 'interests' && interests.length === 0 ? 'Not sure yet' : 'Continue'} disabled={!canContinue} onPress={next} />
        )}
      </View>
    </Animated.View>
  );
}

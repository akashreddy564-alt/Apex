import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { haptics } from '@/components/motion';
import { PrimaryButton, SecondaryButton } from '@/components/social/Buttons';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useOrgActions } from '@/hooks/useOrganizations';
import {
  checkWorkEmail,
  isValidOrgName,
  kindLabel,
  normalizeOrgCode,
  ORG_CODE_LENGTH,
  ORG_NAME_MAX,
  suggestedName,
  type OrgKind,
} from '@/lib/organizations';
import { fonts } from '@/theme/tokens';

type Step =
  | { kind: 'email' }
  | { kind: 'code'; email: string; domain: string }
  | { kind: 'name'; domain: string; suggested: OrgKind };

const KINDS: OrgKind[] = ['school', 'company'];

function message(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  const c = useColors();
  return (
    <TextInput
      placeholderTextColor={c.fgFaint}
      className="mt-5 rounded-xl border border-raised bg-surface px-4 py-4 text-fg"
      {...props}
      style={[{ fontFamily: fonts.ui, fontSize: 17 }, props.style]}
    />
  );
}

function ErrorLine({ text }: { text: string | null }) {
  const c = useColors();
  return text ? (
    <Text accessibilityLiveRegion="polite" style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 14, marginTop: 12 }}>
      {text}
    </Text>
  ) : null;
}

function VerifyFlow() {
  const c = useColors();
  const router = useRouter();
  const actions = useOrgActions();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgKind>('company');
  const [error, setError] = useState<string | null>(null);

  const open = (id: string) => router.replace({ pathname: '/org/[id]', params: { id } });

  const send = async (to = email) => {
    setError(null);
    const check = checkWorkEmail(to);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    try {
      await actions.sendCode(to);
      haptics.success();
      setCode('');
      setStep({ kind: 'code', email: to.trim(), domain: check.domain });
    } catch (e) {
      setError(message(e, 'Couldn’t send the code. Try again.'));
    }
  };

  const confirm = async () => {
    setError(null);
    try {
      const result = await actions.confirm(code);
      if (result.status === 'joined') {
        haptics.success();
        open(result.organizationId);
      } else if (result.status === 'name_it') {
        haptics.success();
        setName(suggestedName(result.domain));
        setKind(result.kind);
        setStep({ kind: 'name', domain: result.domain, suggested: result.kind });
      } else {
        haptics.tapMedium();
        setCode('');
        setError(
          result.triesLeft > 0
            ? `That code didn’t match. ${result.triesLeft} ${result.triesLeft === 1 ? 'try' : 'tries'} left.`
            : 'That code didn’t match. Send a new one.',
        );
      }
    } catch (e) {
      setError(message(e, 'Couldn’t check the code. Try again.'));
    }
  };

  const create = async () => {
    setError(null);
    try {
      const id = await actions.create(name, kind);
      haptics.success();
      open(id);
    } catch (e) {
      setError(message(e, 'Couldn’t save the name. Try again.'));
    }
  };

  if (step.kind === 'email') {
    const ready = email.trim().length > 3;
    return (
      <View>
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 22, lineHeight: 27 }}>
          Join your school or company board
        </Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 8 }}>
          We email a code to your school or work address. Apex keeps only the part after the @, so everyone on the board
          really studies or works there.
        </Text>
        <Field
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError(null);
          }}
          placeholder="you@school.edu"
          accessibilityLabel="School or work email"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          autoFocus
          returnKeyType="send"
          onSubmitEditing={() => (ready ? void send() : undefined)}
        />
        <ErrorLine text={error} />
        <View className="mt-6">
          <PrimaryButton label="Send code" onPress={() => void send()} disabled={!ready} busy={actions.sending} />
        </View>
      </View>
    );
  }

  if (step.kind === 'code') {
    const ready = code.length === ORG_CODE_LENGTH;
    return (
      <View>
        <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 22, lineHeight: 27 }}>Check your email</Text>
        <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 8 }}>
          We sent a 6-digit code to {step.email}. It works for 15 minutes.
        </Text>
        <Field
          value={code}
          onChangeText={(text) => {
            setCode(normalizeOrgCode(text));
            setError(null);
          }}
          placeholder="123456"
          accessibilityLabel="Code from the email"
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          autoFocus
          maxLength={ORG_CODE_LENGTH + 2}
          returnKeyType="done"
          onSubmitEditing={() => (ready ? void confirm() : undefined)}
          style={{ fontFamily: fonts.mono, fontSize: 28, letterSpacing: 8, textAlign: 'center' }}
        />
        <ErrorLine text={error} />
        <View className="mt-6 gap-3">
          <PrimaryButton label="Verify" onPress={() => void confirm()} disabled={!ready} busy={actions.confirming} />
          <SecondaryButton label="Send a new code" onPress={() => void send(step.email)} busy={actions.sending} />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setError(null);
            setStep({ kind: 'email' });
          }}
          hitSlop={10}
          className="mt-6 self-center active:opacity-60"
        >
          <Text style={{ color: c.fgMuted, fontFamily: fonts.uiMedium, fontSize: 14 }}>Use a different email</Text>
        </Pressable>
      </View>
    );
  }

  const ready = isValidOrgName(name);
  return (
    <View>
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 22, lineHeight: 27 }}>
        You’re the first from {step.domain}
      </Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 8 }}>
        Name it the way people there say it. Everyone who verifies an @{step.domain} email joins this board.
      </Text>
      <View className="mt-5 flex-row rounded-xl bg-surface p-1" accessibilityRole="radiogroup">
        {KINDS.map((option) => {
          const on = option === kind;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.select();
                setKind(option);
              }}
              className={`flex-1 items-center rounded-lg py-2.5 ${on ? 'bg-fg' : ''}`}
            >
              <Text style={{ color: on ? c.bg : c.fgMuted, fontFamily: fonts.uiSemibold, fontSize: 14 }}>
                {kindLabel(option)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Field
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        placeholder={kind === 'school' ? 'University of Washington' : 'Company name'}
        accessibilityLabel={kind === 'school' ? 'School name' : 'Company name'}
        maxLength={ORG_NAME_MAX}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => (ready ? void create() : undefined)}
      />
      <ErrorLine text={error} />
      <View className="mt-6">
        <PrimaryButton label={`Create ${kindLabel(kind).toLowerCase()} board`} onPress={() => void create()} disabled={!ready} busy={actions.creating} />
      </View>
    </View>
  );
}

/** Verify a school or work email, then land on that organization's board. */
export default function VerifyOrgScreen() {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SignInGate why="join your school or company board">{() => <VerifyFlow />}</SignInGate>
    </ScrollView>
  );
}

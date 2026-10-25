import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, Share, Text, TextInput, View } from 'react-native';

import { SecondaryButton } from '@/components/social/Buttons';
import { PersonRow } from '@/components/social/PersonRow';
import { QrCode } from '@/components/social/QrCode';
import { RelationButton } from '@/components/social/RelationButton';
import { SignInGate } from '@/components/social/SignInGate';
import { useColors } from '@/hooks/useColors';
import { useFriendships, usePeopleSearch } from '@/hooks/useFriends';
import { friendInvitePath } from '@/lib/friends';
import type { Profile } from '@/lib/profile';
import { fonts } from '@/theme/tokens';

function Search() {
  const c = useColors();
  const [query, setQuery] = useState('');
  const { people, searching, error } = usePeopleSearch(query);
  const { relationTo } = useFriendships();
  const typed = query.trim().length > 0;

  return (
    <View>
      <View className="flex-row items-center rounded-xl border border-raised bg-surface px-3">
        <Text style={{ color: c.fgFaint, fontFamily: fonts.ui, fontSize: 16 }}>@</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          placeholder="Search by username"
          placeholderTextColor={c.fgFaint}
          accessibilityLabel="Search by username"
          returnKeyType="search"
          className="flex-1 py-3 pl-1 text-fg"
          style={{ fontFamily: fonts.ui, fontSize: 16 }}
        />
        {searching ? <ActivityIndicator color={c.fgMuted} /> : null}
      </View>
      {error ? (
        <Text style={{ color: c.disliked, fontFamily: fonts.ui, fontSize: 13, marginTop: 10 }}>{error}</Text>
      ) : null}
      <View className="mt-2">
        {people.map((person) => (
          <PersonRow
            key={person.id}
            person={person}
            action={
              <RelationButton
                personId={person.id}
                name={person.display_name}
                relation={relationTo(person.id)}
              />
            }
          />
        ))}
        {typed && !searching && people.length === 0 && !error ? (
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 10 }}>
            No one with that username yet. Send them your link instead.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function Invite({ profile }: { profile: Profile }) {
  const c = useColors();
  const link = Linking.createURL(friendInvitePath(profile.id));
  const share = () => {
    void Share.share({
      message: `Add me on Apex: I'm @${profile.username}. ${link}`,
    });
  };
  return (
    <View className="mt-8 rounded-2xl bg-surface px-5 py-6">
      <Text style={{ color: c.fg, fontFamily: fonts.display, fontSize: 18 }}>Your invite</Text>
      <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 14, marginTop: 6, lineHeight: 20 }}>
        In person, have them point their camera here. Otherwise send your link, or tell them your
        username.
      </Text>
      <View className="mt-5 items-center">
        <View style={{ borderRadius: 16, overflow: 'hidden' }}>
          <QrCode value={link} size={196} />
        </View>
        <Text
          selectable
          style={{ color: c.fg, fontFamily: fonts.uiSemibold, fontSize: 18, marginTop: 14 }}
        >
          @{profile.username}
        </Text>
      </View>
      <View className="mt-5">
        <SecondaryButton label="Share invite link" onPress={share} />
      </View>
    </View>
  );
}

export default function AddFriendsScreen() {
  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <SignInGate why="add friends">
        {(profile) => (
          <>
            <Search />
            <Invite profile={profile} />
          </>
        )}
      </SignInGate>
    </ScrollView>
  );
}

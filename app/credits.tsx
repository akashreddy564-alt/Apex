import * as Linking from 'expo-linking';
import { Pressable, ScrollView, Text } from 'react-native';

import { HERO_PLACES } from '@/data/heroPlaces';

export default function CreditsScreen() {
  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerClassName="px-4 pb-12 pt-6">
      <Text className="font-mono text-[11px] leading-5 text-zinc-500">
        Opening-screen photos from Wikimedia Commons, cropped and re-compressed. Tap one to open its
        source and license.
      </Text>
      {HERO_PLACES.map((place) => (
        <Pressable
          key={place.id}
          accessibilityRole="link"
          accessibilityLabel={`${place.name}, photo by ${place.photoCredit.author}, ${place.photoCredit.license}`}
          onPress={() => void Linking.openURL(place.photoCredit.url)}
          className="border-b border-zinc-800 py-3 active:opacity-70"
        >
          <Text className="text-[15px] text-zinc-100">{place.name}</Text>
          <Text className="mt-1 font-mono text-[11px] text-zinc-500">
            {place.photoCredit.author} · {place.photoCredit.license}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

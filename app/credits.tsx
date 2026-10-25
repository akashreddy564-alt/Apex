import * as Linking from 'expo-linking';
import { Pressable, ScrollView, Text } from 'react-native';

import { HERO_PLACES } from '@/data/heroPlaces';

const DATA_CREDITS = [
  {
    name: '© OpenStreetMap contributors',
    detail: 'Catalog trail lines · Open Database License',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'USGS 3D Elevation Program',
    detail: 'Catalog elevations · public domain, via Open Topo Data',
    url: 'https://www.opentopodata.org/datasets/ned/',
  },
] as const;

export default function CreditsScreen() {
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pb-12 pt-6">
      <Text className="font-mono text-[11px] uppercase tracking-widest text-fg-faint">Trail data</Text>
      {DATA_CREDITS.map((credit) => (
        <Pressable
          key={credit.name}
          accessibilityRole="link"
          accessibilityLabel={`${credit.name}, ${credit.detail}`}
          onPress={() => void Linking.openURL(credit.url)}
          className="border-b border-raised py-3 active:opacity-70"
        >
          <Text className="text-[15px] text-fg">{credit.name}</Text>
          <Text className="mt-1 font-mono text-[11px] text-fg-faint">{credit.detail}</Text>
        </Pressable>
      ))}
      <Text className="mt-8 font-mono text-[11px] leading-5 text-fg-faint">
        Opening-screen photos from Wikimedia Commons, cropped and re-compressed. Tap one to open its
        source and license.
      </Text>
      {HERO_PLACES.map((place) => (
        <Pressable
          key={place.id}
          accessibilityRole="link"
          accessibilityLabel={`${place.name}, photo by ${place.photoCredit.author}, ${place.photoCredit.license}`}
          onPress={() => void Linking.openURL(place.photoCredit.url)}
          className="border-b border-raised py-3 active:opacity-70"
        >
          <Text className="text-[15px] text-fg">{place.name}</Text>
          <Text className="mt-1 font-mono text-[11px] text-fg-faint">
            {place.photoCredit.author} · {place.photoCredit.license}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

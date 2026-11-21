import * as Linking from 'expo-linking';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Eyebrow } from '@/components/motion';
import { HERO_PLACES } from '@/data/heroPlaces';
import { useColors } from '@/hooks/useColors';
import { cardStyle } from '@/theme/tokens';

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
  const c = useColors();
  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-4 pb-12 pt-6">
      <View style={[cardStyle(c), { paddingVertical: 8 }]}>
        <View style={{ paddingTop: 8, paddingBottom: 4 }}>
          <Eyebrow>Trail data</Eyebrow>
        </View>
        {DATA_CREDITS.map((credit, i) => (
          <Pressable
            key={credit.name}
            accessibilityRole="link"
            accessibilityLabel={`${credit.name}, ${credit.detail}`}
            onPress={() => void Linking.openURL(credit.url)}
            className={`py-3 active:opacity-70 ${i > 0 ? 'border-t border-raised' : ''}`}
          >
            <Text className="text-[15px] text-fg">{credit.name}</Text>
            <Text className="mt-1 font-mono text-[11px] text-fg-faint">{credit.detail}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[cardStyle(c), { marginTop: 16, paddingVertical: 8 }]}>
        <View style={{ paddingTop: 8, paddingBottom: 4 }}>
          <Eyebrow>Photos</Eyebrow>
          <Text className="mt-2 text-[13px] leading-5 text-fg-muted">
            Opening-screen photos from Wikimedia Commons, cropped and re-compressed. Tap one to open its
            source and license.
          </Text>
        </View>
        {HERO_PLACES.map((place) => (
          <Pressable
            key={place.id}
            accessibilityRole="link"
            accessibilityLabel={`${place.name}, photo by ${place.photoCredit.author}, ${place.photoCredit.license}`}
            onPress={() => void Linking.openURL(place.photoCredit.url)}
            className="border-t border-raised py-3 active:opacity-70"
          >
            <Text className="text-[15px] text-fg">{place.name}</Text>
            <Text className="mt-1 font-mono text-[11px] text-fg-faint">
              {place.photoCredit.author} · {place.photoCredit.license}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

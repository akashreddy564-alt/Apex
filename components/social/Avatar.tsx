import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { photoFor } from '@/lib/avatar';
import { initials } from '@/lib/username';
import { fonts } from '@/theme/tokens';

/**
 * A person's photo on a disc, or their initials when there's no photo (or it
 * fails to load). `path` is the profile's `avatar_path`.
 */
export function Avatar({ name, size = 44, path }: { name: string; size?: number; path?: string | null }) {
  const c = useColors();
  const url = photoFor(path);
  const [failed, setFailed] = useState<string | null>(null);
  const showPhoto = url !== null && failed !== url;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.raised,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
          recyclingKey={url}
          onError={() => setFailed(url)}
        />
      ) : (
        <Text style={{ color: c.fg2, fontFamily: fonts.uiSemibold, fontSize: Math.round(size * 0.36) }}>
          {initials(name) || '?'}
        </Text>
      )}
    </View>
  );
}

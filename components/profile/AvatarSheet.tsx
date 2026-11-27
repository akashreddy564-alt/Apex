import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Camera, ImageIcon, Trash2 } from 'lucide-react-native';
import { forwardRef, useCallback, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics, PressScale } from '@/components/motion';
import { useColors } from '@/hooks/useColors';
import { fonts } from '@/theme/tokens';

function Row({ icon, label, tone, onPress }: { icon: ReactNode; label: string; tone?: string; onPress: () => void }) {
  const c = useColors();
  return (
    <PressScale
      to={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingHorizontal: 4 }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </View>
      <Text style={{ color: tone ?? c.fg, fontFamily: fonts.uiMedium, fontSize: 16 }}>{label}</Text>
    </PressScale>
  );
}

/** Quick actions for your own photo: pick from the library, take one, or go back to initials. */
export const AvatarSheet = forwardRef<
  BottomSheetModal,
  { hasPhoto: boolean; onLibrary: () => void; onCamera: () => void; onRemove: () => void }
>(function AvatarSheet({ hasPhoto, onLibrary, onCamera, onRemove }, ref) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
    ),
    [],
  );
  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={backdrop}
      backgroundStyle={{ backgroundColor: c.bg }}
      handleIndicatorStyle={{ backgroundColor: c.borderStrong, width: 40 }}
      onChange={(index) => {
        if (index === 0) haptics.tapLight();
      }}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12 }}>
        <Text accessibilityRole="header" style={{ color: c.fg, fontFamily: fonts.display, fontSize: 20, marginBottom: 6 }}>
          Profile photo
        </Text>
        <Row icon={<ImageIcon size={20} strokeWidth={1.7} color={c.fg2} />} label="Choose from library" onPress={onLibrary} />
        <Row icon={<Camera size={20} strokeWidth={1.7} color={c.fg2} />} label="Take a photo" onPress={onCamera} />
        {hasPhoto ? (
          <Row icon={<Trash2 size={20} strokeWidth={1.7} color={c.disliked} />} label="Remove photo" tone={c.disliked} onPress={onRemove} />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

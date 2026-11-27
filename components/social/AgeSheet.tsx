import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/components/motion';
import { YearWheel } from '@/components/motion/YearWheel';
import { PrimaryButton } from '@/components/social/Buttons';
import { useColors } from '@/hooks/useColors';
import { birthYears, defaultBirthYear, MIN_AGE, oldEnough } from '@/lib/age';
import { fonts } from '@/theme/tokens';

/**
 * Bottom sheet with the birth-year wheel. The page behind dims so the wheel
 * is the only thing to look at; Done saves with a buzz. Under-13s get a
 * plain no and can't continue.
 */
export const AgeSheet = forwardRef<BottomSheetModal, { initial: number | null; onDone: (year: number) => void }>(
  function AgeSheet({ initial, onDone }, ref) {
    const c = useColors();
    const insets = useSafeAreaInsets();
    const now = new Date().getFullYear();
    const years = useMemo(() => birthYears(now), [now]);
    const [year, setYear] = useState(initial ?? defaultBirthYear(now));
    const ok = oldEnough(year, now);

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
        // The wheel owns vertical drags inside the sheet; the handle still pulls it down.
        enableContentPanningGesture={false}
        backgroundStyle={{ backgroundColor: c.bg }}
        handleIndicatorStyle={{ backgroundColor: c.borderStrong, width: 40 }}
        onChange={(index) => {
          if (index === 0) haptics.tapLight();
        }}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 16 }}>
          <Text accessibilityRole="header" style={{ color: c.fg, fontFamily: fonts.displayExtraBold, fontSize: 24, lineHeight: 28 }}>
            When were you born?
          </Text>
          <Text style={{ color: c.fgMuted, fontFamily: fonts.ui, fontSize: 15, lineHeight: 21, marginTop: 6 }}>
            Just the year. It stays on this phone.
          </Text>
          <View style={{ marginTop: 16 }}>
            <YearWheel values={years} value={year} onChange={setYear} />
          </View>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: ok ? c.fgFaint : c.disliked, fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, marginTop: 12, minHeight: 18, textAlign: 'center' }}
          >
            {ok ? ' ' : `Apex is for people ${MIN_AGE} and older.`}
          </Text>
          <View style={{ marginTop: 12 }}>
            <PrimaryButton
              label="Done"
              disabled={!ok}
              onPress={() => {
                haptics.success();
                onDone(year);
              }}
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

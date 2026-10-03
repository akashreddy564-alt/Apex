import { Calendar, ChevronRight, Route, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme/tokens';

interface AddHikeSheetProps {
  visible: boolean;
  onRecord: () => void;
  onPast: () => void;
  onClose: () => void;
}

/** + sheet. Record is the one sage action. Log a past hike stays neutral. */
export function AddHikeSheet({ visible, onRecord, onPast, onClose }: AddHikeSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Close add a hike"
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.66)' }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            backgroundColor: colors.bg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <View
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.borderStrong,
              alignSelf: 'center',
              marginBottom: 16,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                color: colors.fg,
                fontFamily: fonts.displayExtraBold,
                fontWeight: 'normal',
                fontSize: 26,
              }}
            >
              Add a hike
            </Text>
            <Pressable
              accessibilityLabel="Close"
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.raised,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} strokeWidth={1.75} color={colors.fgMuted} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record a hike"
            onPress={onRecord}
            style={{
              marginTop: 18,
              height: 84,
              borderRadius: 22,
              backgroundColor: colors.sage,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                backgroundColor: 'rgba(9,9,11,0.12)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Route size={24} strokeWidth={2} color={colors.onSage} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: colors.onSage,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Record a hike
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  color: colors.onSage,
                  fontFamily: fonts.ui,
                }}
              >
                Track with GPS · saves as you go
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={2.2} color={colors.onSage} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Log a past hike"
            onPress={onPast}
            style={{
              marginTop: 10,
              height: 84,
              borderRadius: 22,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.raised,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              paddingHorizontal: 18,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 15,
                backgroundColor: colors.raised,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={22} strokeWidth={1.75} color={colors.fg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 18,
                  color: colors.fg,
                  fontFamily: fonts.uiSemibold,
                  fontWeight: 'normal',
                }}
              >
                Log a past hike
              </Text>
              <Text
                style={{
                  marginTop: 3,
                  fontSize: 13,
                  color: colors.fgMuted,
                  fontFamily: fonts.ui,
                }}
              >
                Pick a trail and date, add details later
              </Text>
            </View>
            <ChevronRight size={18} strokeWidth={2.2} color={colors.fgFaint} />
          </Pressable>

          <Text
            style={{
              marginTop: 16,
              marginBottom: 8,
              textAlign: 'center',
              fontSize: 13,
              color: colors.fgMuted,
              fontFamily: fonts.ui,
            }}
          >
            Either way, you'll rate it and rank it next.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

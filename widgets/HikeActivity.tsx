import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, monospacedDigit, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/** What the Lock Screen and Dynamic Island show while a hike records. Built by lib/liveActivityPlan. */
export interface HikeActivityProps {
  trail: string;
  /** "2.43" */
  miles: string;
  /** "1,280" */
  climbFt: string;
  /** Epoch ms the moving clock counts from (pauses taken out). */
  clockFrom: number;
  paused: boolean;
  /** "1:12:05", shown frozen while paused. */
  clockText: string;
}

/**
 * Runs inside the widget extension, not the app: no imports, hooks, or
 * outside values. Everything it needs comes in through props.
 */
function HikeActivity(props: HikeActivityProps, environment: LiveActivityEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const fg = dark ? '#F4F1EA' : '#151816';
  const muted = dark ? '#A3A69E' : '#5E625C';
  const climb = '#C08552';
  const distance = '#6FA9D8';
  const clock = props.paused ? (
    <Text modifiers={[font({ size: 28, weight: 'semibold' }), monospacedDigit(), foregroundStyle(muted)]}>{props.clockText}</Text>
  ) : (
    <Text
      date={new Date(props.clockFrom)}
      dateStyle="timer"
      modifiers={[font({ size: 28, weight: 'semibold' }), monospacedDigit(), foregroundStyle(fg)]}
    />
  );
  const smallClock = props.paused ? (
    <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(muted)]}>Paused</Text>
  ) : (
    <Text
      date={new Date(props.clockFrom)}
      dateStyle="timer"
      modifiers={[font({ size: 14, weight: 'semibold' }), monospacedDigit(), foregroundStyle(fg)]}
    />
  );
  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ horizontal: 18, vertical: 14 })]}>
        <VStack alignment="leading" spacing={4}>
          <HStack spacing={6}>
            <Image systemName="figure.hiking" size={14} color={fg} />
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), foregroundStyle(fg)]}>{props.trail}</Text>
          </HStack>
          <HStack spacing={14}>
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit(), foregroundStyle(distance)]}>
              {props.miles + ' mi'}
            </Text>
            <Text modifiers={[font({ size: 15, weight: 'semibold' }), monospacedDigit(), foregroundStyle(climb)]}>
              {props.climbFt + ' ft'}
            </Text>
          </HStack>
        </VStack>
        <Spacer />
        <VStack alignment="trailing" spacing={2}>
          {clock}
          <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>
            {props.paused ? 'PAUSED' : 'MOVING'}
          </Text>
        </VStack>
      </HStack>
    ),
    compactLeading: <Image systemName="figure.hiking" size={14} color={climb} />,
    compactTrailing: smallClock,
    minimal: <Image systemName="figure.hiking" size={13} color={climb} />,
    expandedLeading: (
      <VStack alignment="leading" spacing={1}>
        <Text modifiers={[font({ size: 20, weight: 'semibold' }), monospacedDigit(), foregroundStyle(distance)]}>{props.miles}</Text>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>MILES</Text>
      </VStack>
    ),
    expandedTrailing: (
      <VStack alignment="trailing" spacing={1}>
        <Text modifiers={[font({ size: 20, weight: 'semibold' }), monospacedDigit(), foregroundStyle(climb)]}>{props.climbFt}</Text>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>CLIMB FT</Text>
      </VStack>
    ),
    expandedCenter: (
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(fg)]}>{props.trail}</Text>
    ),
    expandedBottom: <HStack modifiers={[padding({ top: 4 })]}>{clock}</HStack>,
  };
}

export default createLiveActivity<HikeActivityProps>('HikeActivity', HikeActivity);

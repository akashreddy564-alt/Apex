import { Gauge, HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  monospacedDigit,
  padding,
  scaleEffect,
  tint,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { WeekWidgetProps } from '@/lib/weekWidget';

/**
 * The Week ring home-screen widget: this week's progress toward the goal
 * and the streak. Small on the Home Screen, a ring on the Lock Screen.
 * Runs inside the widget extension: no imports used at runtime, no hooks,
 * everything arrives through props (lib/weekWidget builds them).
 */
function WeekRing(props: WeekWidgetProps, environment: WidgetEnvironment) {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const fg = dark ? '#F4F1EA' : '#151816';
  const muted = dark ? '#A3A69E' : '#5E625C';
  const bg = dark ? '#09090B' : '#F4F1EA';
  const ring = props.fraction >= 1 ? '#5F9B6E' : props.metric === 'distance' ? '#6FA9D8' : '#C08552';
  const done = props.done ?? '0';
  const fraction = props.fraction ?? 0;

  if (environment.widgetFamily === 'accessoryCircular') {
    return (
      <Gauge
        value={fraction}
        min={0}
        max={1}
        currentValueLabel={<Text modifiers={[font({ size: 13, weight: 'semibold' }), monospacedDigit()]}>{done}</Text>}
        modifiers={[gaugeStyle('circularCapacity'), widgetURL('apex://goal')]}
      >
        <Text>{props.unit}</Text>
      </Gauge>
    );
  }

  return (
    <VStack
      alignment="leading"
      spacing={6}
      modifiers={[padding({ all: 14 }), containerBackground(bg, 'widget'), widgetURL('apex://goal')]}
    >
      <HStack spacing={4}>
        <Text modifiers={[font({ size: 11, weight: 'semibold' }), foregroundStyle(muted)]}>THIS WEEK</Text>
        <Spacer />
        {props.streak > 0 ? (
          <HStack spacing={2}>
            <Image systemName="flame.fill" size={11} color="#D9733B" />
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), monospacedDigit(), foregroundStyle(fg)]}>
              {String(props.streak)}
            </Text>
          </HStack>
        ) : null}
      </HStack>
      <Spacer />
      <HStack>
        <Spacer />
        <Gauge
          value={fraction}
          min={0}
          max={1}
          currentValueLabel={
            <Text modifiers={[font({ size: 15, weight: 'bold' }), monospacedDigit(), foregroundStyle(fg)]}>{done}</Text>
          }
          modifiers={[gaugeStyle('circularCapacity'), tint(ring), scaleEffect(1.45), frame({ width: 84, height: 84 })]}
        >
          <Text>{props.unit}</Text>
        </Gauge>
        <Spacer />
      </HStack>
      <Spacer />
      <Text modifiers={[font({ size: 12, weight: 'medium' }), monospacedDigit(), foregroundStyle(muted)]}>
        {'of ' + props.target + ' ' + props.unit + (props.hikes === 1 ? ' · 1 hike' : props.hikes > 1 ? ' · ' + String(props.hikes) + ' hikes' : '')}
      </Text>
    </VStack>
  );
}

export default createWidget('WeekRing', WeekRing);

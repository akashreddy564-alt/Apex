import { requireOptionalNativeModule } from 'expo';
import { AppState, Platform } from 'react-native';

import { weekWidgetTimeline, type WeekWidgetProps } from '@/lib/weekWidget';
import { useGoal } from '@/stores/goalStore';
import { useTrailCache } from '@/stores/trailCache';

type Widget = import('expo-widgets').Widget<WeekWidgetProps>;

let widget: Widget | null | undefined;

/** The widget, or null on Android, web, and builds made before it existed (loading it there throws). */
function load(): Widget | null {
  if (widget !== undefined) return widget;
  widget = null;
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoWidgets')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    widget = (require('@/widgets/WeekRing') as { default: Widget }).default;
  } catch {
    widget = null;
  }
  return widget;
}

let last = '';

function push(): void {
  const w = load();
  if (!w) return;
  const { metric, target } = useGoal.getState();
  const entries = weekWidgetTimeline(useTrailCache.getState().logs, { metric, target });
  // Only reload the widget when what it shows changed; reloads are budgeted by iOS.
  const key = JSON.stringify(entries.map((e) => e.props));
  if (key === last) return;
  last = key;
  try {
    w.updateTimeline(entries);
  } catch {
    // Widget extension missing or the system declined; the app carries on.
  }
}

/**
 * Keeps the Week ring widget current: when hikes or the goal change, and as
 * the app goes to the background. Returns a stop function.
 */
export function startWeekWidgetSync(): () => void {
  if (Platform.OS !== 'ios') return () => undefined;
  push();
  const offLogs = useTrailCache.subscribe((s, prev) => {
    if (s.logs !== prev.logs) push();
  });
  const offGoal = useGoal.subscribe((s, prev) => {
    if (s.metric !== prev.metric || s.target !== prev.target) push();
  });
  const app = AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      last = '';
      push();
    }
  });
  return () => {
    offLogs();
    offGoal();
    app.remove();
  };
}

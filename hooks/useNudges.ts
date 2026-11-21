import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { installNotificationHandler, noteAppOpen, noteTap, refreshNudges, supported } from '@/lib/nudgeScheduler';

installNotificationHandler();

/**
 * Keeps reminders current: notes each app open (that's how the send hour is
 * learned and why a reminder is skipped right after a visit), re-plans on
 * open and on leaving the app, and follows a tapped reminder to its screen.
 */
export function useNudges() {
  const router = useRouter();

  useEffect(() => {
    if (!supported) return;
    void noteAppOpen().then(refreshNudges);

    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void noteAppOpen().then(refreshNudges);
      else if (next === 'background') void refreshNudges();
    });

    const go = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const url = noteTap(response);
      if (url) router.push(url as Href);
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    // A reminder that cold-started the app.
    go(Notifications.getLastNotificationResponse());
    const taps = Notifications.addNotificationResponseReceivedListener(go);

    return () => {
      appState.remove();
      taps.remove();
    };
  }, [router]);
}

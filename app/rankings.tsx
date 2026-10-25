import { Redirect } from 'expo-router';

/** Rankings used to be a tab. Old links land on Log's Rankings view. */
export default function RankingsRedirect() {
  return <Redirect href="/log?view=rankings" />;
}

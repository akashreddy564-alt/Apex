import { act, create, type ReactTestRenderer } from 'react-test-renderer';

const redirects: string[] = [];
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    redirects.push(href);
    return null;
  },
}));

import RankingsRedirect from '@/app/rankings';

it('sends the old Rankings route to Log rankings', () => {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<RankingsRedirect />);
  });
  expect(tree).toBeTruthy();
  expect(redirects).toEqual(['/log?view=rankings']);
});

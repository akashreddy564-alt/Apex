import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking } from 'react-native';

import { PhotoCreditsLink } from '@/components/opening/PhotoCreditsLink';
import { SUPPORT_EMAIL } from '@/lib/legal';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));

it('Settings → About has an Email support row that opens a mailto link', () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<PhotoCreditsLink />);
  });
  const row = tree.root.findAll(
    (n) => n.props.accessibilityLabel === 'Email support' && typeof n.props.onPress === 'function',
  )[0]!;
  act(() => row.props.onPress());
  expect(open).toHaveBeenCalledWith(`mailto:${SUPPORT_EMAIL}`);
  expect(SUPPORT_EMAIL).toBe('support@hikeapex.com');
});

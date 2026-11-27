import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@/hooks/useTaggable', () => ({ useTaggable: () => [] }));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///pick.jpg', width: 800, height: 600 }] })),
}));
jest.mock('@/lib/hikePhotos', () => ({
  persistHikePhoto: jest.fn(async () => 'sb:me/new.jpg'),
  resolvePhotoUri: jest.fn(async () => 'https://signed/new.jpg'),
}));
const mockPushLog = jest.fn();
jest.mock('@/lib/remoteSync', () => ({ pushLog: (...args: unknown[]) => mockPushLog(...args) }));

/* eslint-disable import/first */
import { HikeDetailsSheet } from '@/components/log/HikeDetailsSheet';
import { useTrailCache } from '@/stores/trailCache';
/* eslint-enable import/first */

const log = {
  id: 'l1', user_id: 'me', trail_id: 't1', duration_seconds: 3600, photos: ['sb:me/old.jpg'],
  notes: null, recorded_path: null, created_at: new Date().toISOString(),
};

describe('hike details sheet photos', () => {
  it('adds a photo to a recorded hike and saves it with the details', async () => {
    useTrailCache.setState({ logs: [log as never] });
    let tree!: ReactTestRenderer;
    await act(async () => {
      tree = create(<HikeDetailsSheet logId="l1" onClose={jest.fn()} />);
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(1);
    const add = tree.root.findAll((n) => n.props.accessibilityLabel === 'Add photo' && typeof n.props.onPress === 'function')[0]!;
    await act(async () => {
      add.props.onPress();
    });
    expect(tree.root.findAllByType(Image)).toHaveLength(2);
    const save = tree.root.findAll((n) => n.props.accessibilityLabel === 'Save hike details' && typeof n.props.onPress === 'function')[0]!;
    act(() => save.props.onPress());
    expect(useTrailCache.getState().logs[0]!.photos).toEqual(['sb:me/old.jpg', 'sb:me/new.jpg']);
    expect(mockPushLog).toHaveBeenCalledWith(expect.objectContaining({ photos: ['sb:me/old.jpg', 'sb:me/new.jpg'] }));
  });
});

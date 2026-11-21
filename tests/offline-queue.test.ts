import { dehydrate, onlineManager } from '@tanstack/react-query';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/supabase', () => ({ supabase: null }));
const mockSetLiked = jest.fn();
jest.mock('@/lib/feed', () => ({
  setLiked: (...args: unknown[]) => mockSetLiked(...args),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
}));
jest.mock('@/lib/friends', () => ({
  sendFriendRequest: jest.fn(),
  respondToRequest: jest.fn(),
  removeFriend: jest.fn(),
}));
jest.mock('@/lib/groups', () => ({ leaveGroup: jest.fn(), removeMember: jest.fn() }));
jest.mock('@/lib/safety', () => ({
  blockPerson: jest.fn(),
  unblockPerson: jest.fn(),
  sendReport: jest.fn(),
  markNotificationsRead: jest.fn(),
}));

// eslint-disable-next-line import/first
import { M, queryClient } from '@/lib/queryClient';

// The app's provider mounts the client; that's what listens for reconnects.
beforeAll(() => queryClient.mount());
afterAll(() => queryClient.unmount());

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  mockSetLiked.mockReset();
  onlineManager.setOnline(true);
  queryClient.getMutationCache().clear();
});

it('pauses a write that can’t reach the network, then sends it when back online', async () => {
  mockSetLiked.mockRejectedValueOnce(new TypeError('Network request failed')).mockResolvedValue(undefined);

  const mutation = queryClient.getMutationCache().build(queryClient, { mutationKey: M.like, gcTime: 0 });
  const done = mutation.execute({ postId: 'p1', userId: 'u1', liked: true });
  await wait(1_300);

  expect(onlineManager.isOnline()).toBe(false);
  expect(mutation.state.isPaused).toBe(true);
  // Paused writes are what gets saved to disk, so they survive the app closing.
  expect(dehydrate(queryClient).mutations).toHaveLength(1);

  onlineManager.setOnline(true);
  await done;

  expect(mockSetLiked).toHaveBeenCalledTimes(2);
  expect(mutation.state.status).toBe('success');
}, 10_000);

it('fails at once, without queueing, when the server refuses', async () => {
  mockSetLiked.mockRejectedValue(Object.assign(new Error('rate_limited:like'), { code: 'P0429' }));

  const mutation = queryClient.getMutationCache().build(queryClient, { mutationKey: M.like, gcTime: 0 });
  await expect(mutation.execute({ postId: 'p1', userId: 'u1', liked: true })).rejects.toThrow('rate_limited');
  await wait(0);

  expect(mockSetLiked).toHaveBeenCalledTimes(1);
  expect(onlineManager.isOnline()).toBe(true);
  expect(dehydrate(queryClient).mutations).toHaveLength(0);
});

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Collects the page's base64 pieces into a cached MP4, then opens the share sheet. */
export function videoWriter(name: string) {
  const file = new File(Paths.cache, `${name}.mp4`);
  if (file.exists) file.delete();
  file.create();
  return {
    append(base64: string) {
      file.write(base64, { encoding: 'base64', append: true });
    },
    async share() {
      // The share sheet carries Save Video, Instagram and Messages.
      await Sharing.shareAsync(file.uri, { mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: 'Share your flyover' });
    },
  };
}

/** Web: the pieces become a Blob, saved as a download. */
export function videoWriter(name: string) {
  const parts: Uint8Array[] = [];
  return {
    append(base64: string) {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      parts.push(bytes);
    },
    async share() {
      const url = URL.createObjectURL(new Blob(parts as BlobPart[], { type: 'video/mp4' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.mp4`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
  };
}

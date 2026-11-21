import { useEffect, useRef } from 'react';

import type { FlyoverViewProps } from './FlyoverView';

/** Web: the same page in an iframe; messages come back through postMessage. */
export function FlyoverView({ html, onMessage }: FlyoverViewProps) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const listen = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || typeof event.data !== 'string') return;
      handler.current(event.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return (
    <iframe
      ref={frame}
      srcDoc={html}
      title="Route flyover"
      aria-hidden
      tabIndex={-1}
      style={{ border: 0, width: '100%', height: '100%', background: '#09090B', display: 'block' }}
    />
  );
}

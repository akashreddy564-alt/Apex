import { useEffect, useState } from 'react';

const PERIOD_MS = 3200;
const CYCLE = 170;

/** Solid dash phase for a stroke that should keep traveling. No blur. */
export function useMovingDash(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const t = (Date.now() % PERIOD_MS) / PERIOD_MS;
      setOffset(-t * CYCLE);
    }, 32);
    return () => clearInterval(id);
  }, []);

  return offset;
}

interface HikeDateFieldProps {
  value: Date;
  maximumDate: Date;
  onChange: (date: Date) => void;
}

function toYmd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function fromYmd(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Browser date picker. The native file uses the system picker. */
export function HikeDateField({ value, maximumDate, onChange }: HikeDateFieldProps) {
  return (
    <input
      type="date"
      aria-label="Hike date"
      value={toYmd(value)}
      max={toYmd(maximumDate)}
      onChange={(event) => {
        const next = fromYmd(event.target.value);
        if (next) onChange(next);
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        backgroundColor: '#18181B',
        color: '#F4F4F5',
        border: '1px solid #27272A',
        borderRadius: 12,
        padding: 12,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 14,
        colorScheme: 'dark',
      }}
    />
  );
}

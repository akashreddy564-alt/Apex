import type { HikeLog, Trail, TrailRanking } from '@/types/trail';

function xml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function hikesToGpx(logs: HikeLog[], trailName: (id: string) => string): string {
  const tracks = logs
    .filter((log) => log.recorded_path && log.recorded_path.coordinates.length >= 2)
    .map((log) => {
      const points = log.recorded_path!.coordinates
        .map((position) => {
          const [lon, lat, ele] = position;
          const elevation = ele == null ? '' : `<ele>${ele}</ele>`;
          return `<trkpt lat="${lat}" lon="${lon}">${elevation}<time>${xml(log.created_at)}</time></trkpt>`;
        })
        .join('');
      return `<trk><name>${xml(trailName(log.trail_id))}</name><trkseg>${points}</trkseg></trk>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Apex">\n${tracks}\n</gpx>\n`;
}

export function hikesToCsv(
  logs: HikeLog[],
  rankings: TrailRanking[],
  trailName: (id: string) => string,
): string {
  const byTrail = new Map(rankings.map((row) => [row.trail_id, row]));
  const lines = ['date,trail,duration_seconds,notes,bucket,position,photos'];
  for (const log of logs) {
    const ranking = byTrail.get(log.trail_id);
    lines.push(
      [
        log.created_at,
        trailName(log.trail_id),
        String(log.duration_seconds),
        log.notes ?? '',
        ranking?.bucket ?? '',
        ranking?.position ?? '',
        String(log.photos.length),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function photoLines(logs: HikeLog[], trails: Trail[]): string {
  const name = new Map(trails.map((trail) => [trail.id, trail.name]));
  const lines = ['Photos stay in your camera roll. These are the copies Apex stored.'];
  for (const log of logs) {
    for (const photo of log.photos) {
      lines.push(`${name.get(log.trail_id) ?? log.trail_id}\t${photo}`);
    }
  }
  if (lines.length === 1) lines.push('No photos stored in Apex.');
  return lines.join('\n');
}

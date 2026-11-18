// Lecture du carnet de musculation saisi à la main (Excel FR : séparateur « ; » et virgule décimale acceptés).
import type { Activity, SetLog } from './types.ts';

export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const header = lines[0].split(sep).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const cells = line.split(sep);
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = (cells[i] ?? '').trim(); });
    return row;
  });
}

export function parseNumber(s: string | undefined): number | undefined {
  if (s === undefined || s.trim() === '') return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Accepte AAAA-MM-JJ ou JJ/MM/AAAA ; renvoie la clé AAAA-MM-JJ. */
export function parseDateKey(s: string): string | undefined {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}`;
  return undefined;
}

function naiveDate(dateKey: string, hhmm: string | undefined): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = (hhmm && /^\d{1,2}:\d{2}/.test(hhmm) ? hhmm : '18:00').split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

export interface CsvIssue { line: number; message: string }

/** Une ligne = une série. La durée de séance peut figurer sur n'importe quelle ligne du jour. */
export function strengthSessionsFromCsv(text: string): { sessions: Activity[]; issues: CsvIssue[] } {
  const rows = parseCsv(text);
  const issues: CsvIssue[] = [];
  const byKey = new Map<string, Activity>();
  rows.forEach((r, idx) => {
    const line = idx + 2;
    const dk = parseDateKey(r['date'] ?? '');
    const reps = parseNumber(r['reps']);
    if (!dk || !r['exercice'] || reps === undefined) {
      issues.push({ line, message: 'date, exercice ou reps manquant : ligne ignorée' });
      return;
    }
    const start = naiveDate(dk, r['heure']);
    const key = start.toISOString();
    let s = byKey.get(key);
    if (!s) {
      s = { id: `csv-${key}`, source: 'csv', sport: 'strength', name: 'Musculation', start, durationS: 0, distanceM: 0, elevGainM: 0, sets: [] };
      byKey.set(key, s);
    }
    const set: SetLog = { exercise: r['exercice'], loadKg: parseNumber(r['charge_kg']) ?? 0, reps, rpe: parseNumber(r['rpe']) };
    s.sets!.push(set);
    const dur = parseNumber(r['duree_seance_min']);
    if (dur) s.durationS = dur * 60;
  });
  return { sessions: [...byKey.values()], issues };
}

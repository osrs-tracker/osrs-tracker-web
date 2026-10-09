import { Logger } from '@osrs-tracker/logger';
import { createServerLogger } from '../utils/log';

/** A server logger that keeps its lines, parsed, instead of writing them to stdout */
export function collectLogs(): { logger: Logger; lines: Record<string, unknown>[] } {
  const lines: Record<string, unknown>[] = [];
  return { logger: createServerLogger({ write: (line: string) => void lines.push(JSON.parse(line)) }), lines };
}

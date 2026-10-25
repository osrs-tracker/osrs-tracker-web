import { Logger } from '@osrs-tracker/logger';
import { createServerLogger } from '../utils/log';

export function collectLogs(): { logger: Logger; lines: Record<string, unknown>[] } {
  const lines: Record<string, unknown>[] = [];
  return { logger: createServerLogger({ write: (line: string) => void lines.push(JSON.parse(line)) }), lines };
}

// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('security.txt', () => {
  // RFC 9116 asks for an Expires under a year ahead, and finders may ignore an expired file. This fails CI a month
  // ahead, as nothing else notices: move the date a year on
  it('expires more than 30 days from now', () => {
    const file = readFileSync('public/.well-known/security.txt', 'utf8');
    const expires = new Date(file.match(/^Expires: (.+)$/m)![1]);

    expect(expires.getTime() - Date.now()).toBeGreaterThan(30 * 24 * 60 * 60 * 1000);
  });
});

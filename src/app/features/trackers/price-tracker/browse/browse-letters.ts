/** The browse pages' letters, as in their URLs: `a`–`z`, then `0` for names starting with anything else (a digit). */
export const BROWSE_LETTERS: readonly string[] = [...'abcdefghijklmnopqrstuvwxyz', '0'];

export function isBrowseLetter(letter: string): boolean {
  return BROWSE_LETTERS.includes(letter);
}

/** "A", or "0–9" for `0` */
export function browseLetterLabel(letter: string): string {
  return letter === '0' ? '0–9' : letter.toUpperCase();
}

/** "starting with A", or "starting with a number" for `0` */
export function startingWith(letter: string): string {
  return letter === '0' ? 'starting with a number' : `starting with ${letter.toUpperCase()}`;
}

/** The browse page an item is listed on, as the API files it: accented letters under their base letter. */
export function browseLetterOf(name: string): string {
  const first = name.normalize('NFD').charAt(0).toLowerCase();
  return /[a-z]/.test(first) ? first : '0';
}

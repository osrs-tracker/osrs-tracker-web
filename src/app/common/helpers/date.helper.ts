/** Round down to the utc start of the day. */
export const utcStartOfDay = (date: Date) => new Date(date.getTime() - (date.getTime() % (86400 * 1000)));

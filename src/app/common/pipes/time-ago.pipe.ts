import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'timeAgo',
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | number | string | null | undefined): string | null {
    if (!value) return null;

    const date = new Date(value);

    const seconds = Math.floor((+new Date() - date.getTime()) / 1000);

    if (seconds < 29) return 'just now';

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    };

    for (const key in intervals) {
      const interval = intervals[key];

      if (seconds >= interval) {
        const count = Math.floor(seconds / interval);
        return `${count} ${key}${count === 1 ? '' : 's'} ago`;
      }
    }

    throw new Error('Invalid date');
  }
}

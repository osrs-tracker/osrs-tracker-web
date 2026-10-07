import { Pipe, PipeTransform } from '@angular/core';
import { format, isToday, isYesterday } from 'date-fns';

@Pipe({
  name: 'shortDate',
})
export class ShortDatePipe implements PipeTransform {
  /** E.g. "Sun 5 Oct", or "Today · Mon 6 Oct" and "Yesterday · Sun 5 Oct" */
  transform(date: Date | string | number | null | undefined): string {
    if (!date) return '';

    const dateObj = new Date(date);
    const day = format(dateObj, 'EEE d MMM');

    if (isToday(dateObj)) return `Today · ${day}`;
    if (isYesterday(dateObj)) return `Yesterday · ${day}`;
    return day;
  }
}

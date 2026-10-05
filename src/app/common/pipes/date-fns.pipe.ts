import { Pipe, PipeTransform } from '@angular/core';
import { format, isToday, isYesterday } from 'date-fns';

@Pipe({
  name: 'shortDate',
})
export class ShortDatePipe implements PipeTransform {
  /** `short` abbreviates the month, for narrow screens */
  transform(date: Date | string | number | null | undefined, length: 'long' | 'short' = 'long'): string {
    if (!date) return '';

    const dateObj = new Date(date);

    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';

    return format(dateObj, length === 'short' ? 'MMM do' : 'MMMM do');
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { format, isToday, isYesterday } from 'date-fns';

@Pipe({
  standalone: true,
  name: 'dateFns',
})
export class DateFnsPipe implements PipeTransform {
  transform(date: Date | string | number | null | undefined): string {
    if (!date) return '';

    const dateObj = new Date(date);

    if (isToday(dateObj)) return 'Today';
    if (isYesterday(dateObj)) return 'Yesterday';

    return format(dateObj, 'MMMM do');
  }
}

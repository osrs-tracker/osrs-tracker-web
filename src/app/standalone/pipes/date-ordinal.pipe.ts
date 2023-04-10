import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'dateOrdinal',
  pure: true,
})
export class DateOrdinalPipe implements PipeTransform {
  transform(formattedDate: string | null | undefined, value: Date): string | null {
    if (!formattedDate) return null;
    return `${formattedDate}${this.getDateOrdinal(value)}`;
  }

  private getDateOrdinal(date: Date): string {
    const day = new Date(date).getDate();
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }
}

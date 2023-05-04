import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'capitalizeWords',
  pure: true,
})
export class CapitalizePipe implements PipeTransform {
  transform(string: string | undefined | null): string | null {
    if (string == null) return null;
    return this.capitalise(string);
  }

  /** Split the string into an array of words and capitalize each part */
  capitalise(string: string): string {
    return string
      .split(/\s/g)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

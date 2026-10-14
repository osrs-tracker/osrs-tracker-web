import { Pipe, PipeTransform } from '@angular/core';
import { capitalise } from './player-labels';

@Pipe({
  name: 'capitalizeWords',
  pure: true,
})
export class CapitalizePipe implements PipeTransform {
  transform(string: string | undefined | null): string | null {
    if (string == null) return null;
    return capitalise(string);
  }
}

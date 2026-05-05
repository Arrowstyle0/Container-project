import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyMask',
  standalone: true
})
export class KeyMaskPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }
}

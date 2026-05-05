import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keyMask',
})
export class KeyMaskPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}

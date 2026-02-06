import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numberShort'
})
export class NumberShortPipe implements PipeTransform {

  transform(
    value: number | string | null | undefined,
    decimals: number = 1
  ): string {

    if (value === null || value === undefined) return '0';

    const num = Number(value);
    if (isNaN(num)) return '0';

    const abs = Math.abs(num);

    if (abs < 1_000) return num.toString();

    if (abs < 1_000_000)
      return this.format(num, 1_000, 'K', decimals);

    if (abs < 1_000_000_000)
      return this.format(num, 1_000_000, 'M', decimals);

    return this.format(num, 1_000_000_000, 'B', decimals);
  }

  private format(
    value: number,
    divider: number,
    suffix: string,
    decimals: number
  ): string {
    return `${(value / divider).toFixed(decimals)}${suffix}`;
  }

}

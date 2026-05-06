import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'indianCurrency',
  standalone: true,
})
export class IndianCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '₹0';

    if (value >= 10000000) {
      return `₹${this.floor(value / 10000000)}Cr`;
    }

    if (value >= 100000) {
      return `₹${this.floor(value / 100000)}L`;
    }

    return `₹${value.toLocaleString('en-IN')}`;
  }

  private floor(num: number): string {
    return (Math.floor(num * 100) / 100).toFixed(2);
  }
}

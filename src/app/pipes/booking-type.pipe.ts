import { Pipe, PipeTransform } from '@angular/core';
import { typeLabel } from '../shared/booking-types';

/** {{ b.bookingType | bookingType: b.endDrop : b.startPickup }} → "Mopa Airport pickup + Dudhsagar Tour" */
@Pipe({
  name: 'bookingType',
  standalone: true,
})
export class BookingTypePipe implements PipeTransform {
  transform(type: string | null | undefined, endDrop?: string | null, startPickup?: string | null, fullDayHours?: number | null): string {
    return typeLabel(type, endDrop, startPickup, fullDayHours);
  }
}

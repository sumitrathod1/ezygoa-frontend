import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-date-per-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-per-bookings.component.html',
  styleUrl: './date-per-bookings.component.css',
})
export class DatePerBookingsComponent {
  @Input() bookings: any[] = [];
  //@Input() selectedDate!: Date;
  @Input() selectedDate: Date | null = null;
  @Output() close = new EventEmitter<void>();

  get formattedDate(): string {
    return this.selectedDate ? this.selectedDate.toDateString() : '';
  }

  onClose() {
    this.close.emit();
  }
  // callCustomer(phone: string) {
  //   window.open(`tel:${phone}`, '_self');
  // }

  callCustomer(number: string) {
    console.log(number);
    window.open(`tel:${number}`, '_self');
  }
}

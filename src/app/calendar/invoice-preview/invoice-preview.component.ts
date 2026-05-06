import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-preview.component.html',
  styleUrl: './invoice-preview.component.css',
})
export class InvoicePreviewComponent {
  booking: any;
  invoiceNo: string;
  balance: number;
  today = new Date();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _dialog: MatDialog,
    private _invoiceService: InvoiceService
  ) {
    this.booking = data.booking;
    this.invoiceNo = this._invoiceService.generateInvoiceNumber(this.booking);
    this.balance = (this.booking?.amount || 0) - (this.booking?.advancePaid || 0);
  }

  async downloadPDF() {
    await this._invoiceService.downloadPDF(this.booking);
  }

  sendWhatsApp() {
    const url = this._invoiceService.generateWhatsAppUrl(this.booking, this.invoiceNo);
    window.open(url, '_blank');
  }

  close() {
    this._dialog.closeAll();
  }

  formatTime(time?: string | null): string {
    if (!time) return '—';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${suffix}`;
  }
}

import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PdfDownloadService } from './pdf-download.service';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  constructor(private _pdfDownload: PdfDownloadService) {}

  generateInvoiceNumber(booking: any): string {
    const year = new Date().getFullYear();
    const id = String(booking.bookingId || Date.now())
      .slice(-4)
      .padStart(4, '0');
    return `EZY-${year}-${id}`;
  }

  generatePDF(booking: any): jsPDF {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const invoiceNo = this.generateInvoiceNumber(booking);
    const today = new Date();

    // ── Purple gradient header ──
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, W, 50, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('EZY GOA TRAVELS', W / 2, 17, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Your Trusted Travel Partner', W / 2, 25, { align: 'center' });

    doc.setFontSize(9);
    doc.text('+91 7406008393 |  ezygoataxiservices@gmial.com', W / 2, 32, {
      align: 'center',
    });

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(15, 38, W - 15, 38);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('INVOICE', 15, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`No: ${invoiceNo}`, W - 15, 42, { align: 'right' });
    doc.text(
      `Date: ${today.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`,
      W - 15,
      48,
      { align: 'right' }
    );

    let y = 60;

    const drawSection = (title: string) => {
      doc.setFillColor(237, 233, 254);
      doc.rect(10, y, W - 20, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229);
      doc.text(title, 15, y + 5.5);
      y += 11;
      doc.setTextColor(40, 40, 40);
    };

    // ── Customer Details ──
    drawSection('CUSTOMER DETAILS');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Name  :', 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(booking.customer?.customerName || '—', 52, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Phone :', 15, y);
    doc.setFont('helvetica', 'bold');
    doc.text(booking.customer?.customerNumber || '—', 52, y);
    y += 12;

    // ── Trip Details ──
    drawSection('TRIP DETAILS');

    const travelDate = booking.travelDate
      ? new Date(booking.travelDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

    const tripRows = [
      ['From', booking.from || '—'],
      ['To', booking.to || '—'],
      ['Date', travelDate],
      ['Time', this.formatTime(booking.traveltime)],
      ['Type', booking.bookingType || '—'],
      ['Vehicle', booking.vehicle?.vehicleName || 'External'],
      ['Driver', booking.user?.employeeName || 'TBD'],
      ['Passengers', String(booking.pax || 1)],
    ];

    autoTable(doc, {
      startY: y,
      body: tripRows,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: { top: 2.5, bottom: 2.5, left: 5, right: 5 },
        textColor: [40, 40, 40],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45, textColor: [80, 80, 80] },
      },
      alternateRowStyles: { fillColor: [248, 247, 255] },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable?.finalY + 10 || y + 60;

    // ── Payment Details ──
    drawSection('PAYMENT DETAILS');

    const balance = (booking.amount || 0) - (booking.advancePaid || 0);
    const fmt = (n: number) => 'Rs. ' + n.toLocaleString('en-IN');

    autoTable(doc, {
      startY: y,
      body: [
        ['Total Amount', fmt(booking.amount || 0)],
        ['Advance Paid', fmt(booking.advancePaid || 0)],
        ['Balance Due', fmt(balance)],
      ],
      theme: 'plain',
      styles: {
        fontSize: 10,
        cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70, textColor: [80, 80, 80] },
        1: { fontStyle: 'bold' },
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body' || data.column.index !== 1) return;
        if (data.row.index === 1) data.cell.styles.textColor = [22, 163, 74];
        if (data.row.index === 2)
          data.cell.styles.textColor =
            balance <= 0 ? [22, 163, 74] : [220, 38, 38];
      },
      alternateRowStyles: { fillColor: [248, 252, 248] },
      margin: { left: 10, right: 10 },
    });

    y = (doc as any).lastAutoTable?.finalY + 14 || y + 40;

    // ── Footer ──
    doc.setDrawColor(200, 200, 220);
    doc.setLineWidth(0.3);
    doc.line(10, y, W - 10, y);

    y += 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229);
    doc.text('Thank you for choosing Ezy Goa!', W / 2, y, { align: 'center' });

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Have a safe and wonderful journey. We look forward to serving you again!',
      W / 2,
      y,
      { align: 'center' }
    );

    y += 6;
    doc.setFontSize(7);
    doc.text(
      '* This is a computer-generated invoice and does not require a signature.',
      W / 2,
      y,
      { align: 'center' }
    );

    return doc;
  }

  async downloadPDF(booking: any): Promise<void> {
    const doc = this.generatePDF(booking);
    await this._pdfDownload.downloadDoc(
      doc,
      `Invoice-${this.generateInvoiceNumber(booking)}.pdf`
    );
  }

  generateWhatsAppUrl(booking: any, invoiceNo: string): string {
    const phone = this.cleanPhone(booking.customer?.customerNumber || '');
    const name = booking.customer?.customerName || 'Customer';
    const from = booking.from || '';
    const to = booking.to || '';
    const date = booking.travelDate
      ? new Date(booking.travelDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '';
    const amount = (booking.amount || 0).toLocaleString('en-IN');

    const message = [
      `Dear ${name},`,
      '',
      `Thank you for choosing *Ezy Goa Travels!* 🚖`,
      '',
      `*Invoice: ${invoiceNo}*`,
      `📅 Date: ${date}`,
      `📍 From: ${from} → ${to}`,
      `💰 Total: ₹${amount}`,
      '',
      'We hope you have a wonderful journey!',
      '*Ezy Goa Travels* 🙏',
    ].join('\n');

    const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(message)}`;
  }

  private cleanPhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '91' + cleaned;
    return cleaned;
  }

  private formatTime(time?: string | null): string {
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

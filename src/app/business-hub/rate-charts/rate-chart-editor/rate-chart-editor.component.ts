import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RateChartService } from '../../../services/rate-chart.service';
import { VehicleService } from '../../../services/vehicle.service';
import { PdfDownloadService } from '../../../services/pdf-download.service';
import {
  RateChart, RcVehicle, RcRoute, RcSurcharge, RcNote,
} from '../../../models/rate-chart.model';

const FX: Record<string, number> = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 };
const FX_SYM: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

const TYPE_ICON: Record<string, string> = {
  hatchBack: '🚗', sedan: '🚕', suv: '🚙',
  tT17Seater: '🚐', tT20Seater: '🚐',
  bus30Seater: '🚌', bus40Seater: '🚌', bus60Seater: '🚌',
  notspecified: '🚘',
};

@Component({
  selector: 'app-rate-chart-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rate-chart-editor.component.html',
  styleUrl: './rate-chart-editor.component.css',
})
export class RateChartEditorComponent implements OnInit {
  @ViewChild('paperRef') paperRef!: ElementRef<HTMLDivElement>;

  chart!: RateChart;
  isNew = false;
  editMode = false;
  saving = false;
  pdfLoading = false;

  bulkPercent = 10;

  currencies = ['INR', 'USD', 'EUR', 'GBP'];
  displayCurrency = 'INR';

  fleetVehicles: any[] = [];
  showFleetPanel = false;

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _rcService: RateChartService,
    private _vehicleService: VehicleService,
    private _pdfDownload: PdfDownloadService,
  ) {}

  ngOnInit() {
    const id = this._route.snapshot.paramMap.get('id');
    if (!id || id === 'new') {
      this.isNew = true;
      this.chart = this._rcService.buildNew();
      this.editMode = true;
    } else {
      this._rcService.getAll().subscribe((charts) => {
        const found = charts.find((c) => c.id === id);
        if (found) {
          this.chart = JSON.parse(JSON.stringify(found));
        } else {
          this._router.navigate(['/business-hub/rate-charts']);
        }
      });
    }
    this._loadFleet();
  }

  private _loadFleet() {
    this._vehicleService.getAllVehicles().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        this.fleetVehicles = raw;
      },
    });
  }

  fleetIcon(v: any): string {
    const key = v.vehicleType ?? v.VehicleType ?? '';
    const lc = key.charAt(0).toLowerCase() + key.slice(1);
    return TYPE_ICON[lc] ?? '🚘';
  }

  isAlreadyAdded(fv: any): boolean {
    const num = (fv.vehicleNumber ?? fv.VehicleNumber ?? '').toString();
    return this.chart.vehicles.some((v) => v.fleetRef === num);
  }

  addFromFleet(fv: any) {
    if (this.isAlreadyAdded(fv)) return;
    const num = (fv.vehicleNumber ?? fv.VehicleNumber ?? '').toString();
    const name = ((fv.vehicleName ?? fv.VehicleName ?? num) || 'Vehicle').trim();
    const cap = (fv.seatingcapacity ?? fv.Seatingcapacity ?? 0);
    const id = 'v' + Date.now();
    const newV: RcVehicle = {
      id,
      name: name || num,
      icon: this.fleetIcon(fv),
      capacity: cap ? `${cap} Pax` : '',
      fleetRef: num,
    };
    this.chart.vehicles.push(newV);
    for (const r of this.chart.routes) { r.prices[id] = 0; }
    for (const s of this.chart.surcharges) { s.amounts[id] = 0; }
  }

  addAllFromFleet() {
    this.fleetVehicles.filter((fv) => !this.isAlreadyAdded(fv)).forEach((fv) => this.addFromFleet(fv));
  }

  // ── Display helpers ──────────────────────────────────────────
  get currencySymbol() { return FX_SYM[this.displayCurrency] ?? '₹'; }

  convert(amount: number): string {
    const rate = FX[this.displayCurrency] ?? 1;
    const val = amount * rate;
    if (this.displayCurrency === 'INR') return val.toLocaleString('en-IN');
    return val.toFixed(2);
  }

  getPrice(route: RcRoute, vehicleId: string): number {
    const prices = this.chart.seasonMode === 'peak' && route.peakPrices
      ? route.peakPrices
      : route.prices;
    return prices[vehicleId] ?? 0;
  }

  setPrice(route: RcRoute, vehicleId: string, val: string) {
    const n = parseFloat(val) || 0;
    if (this.chart.seasonMode === 'peak') {
      if (!route.peakPrices) route.peakPrices = {};
      route.peakPrices[vehicleId] = n;
    } else {
      route.prices[vehicleId] = n;
    }
  }

  getSurcharge(s: RcSurcharge, vehicleId: string): number {
    return s.amounts[vehicleId] ?? 0;
  }

  setSurcharge(s: RcSurcharge, vehicleId: string, val: string) {
    s.amounts[vehicleId] = parseFloat(val) || 0;
  }

  // ── Bulk update ──────────────────────────────────────────────
  applyBulkUpdate(direction: 1 | -1) {
    const factor = 1 + (direction * this.bulkPercent) / 100;
    for (const r of this.chart.routes) {
      for (const vid of Object.keys(r.prices)) {
        r.prices[vid] = Math.round(r.prices[vid] * factor);
      }
      if (r.peakPrices) {
        for (const vid of Object.keys(r.peakPrices)) {
          r.peakPrices[vid] = Math.round(r.peakPrices[vid] * factor);
        }
      }
    }
  }

  // ── Vehicle / Route / Surcharge / Note management ───────────
  addVehicle() {
    const id = 'v' + Date.now();
    this.chart.vehicles.push({ id, name: 'New Vehicle', icon: '🚗', capacity: '4 Pax' });
    for (const r of this.chart.routes) { r.prices[id] = 0; }
    for (const s of this.chart.surcharges) { s.amounts[id] = 0; }
  }

  removeVehicle(v: RcVehicle) {
    this.chart.vehicles = this.chart.vehicles.filter((x) => x.id !== v.id);
    for (const r of this.chart.routes) { delete r.prices[v.id]; if (r.peakPrices) delete r.peakPrices[v.id]; }
    for (const s of this.chart.surcharges) { delete s.amounts[v.id]; }
  }

  addRoute() {
    const id = 'r' + Date.now();
    const prices: Record<string, number> = {};
    this.chart.vehicles.forEach((v) => (prices[v.id] = 0));
    this.chart.routes.push({ id, emoji: '📍', name: 'New Route', prices });
  }

  removeRoute(r: RcRoute) {
    this.chart.routes = this.chart.routes.filter((x) => x.id !== r.id);
  }

  addSurcharge() {
    const id = 's' + Date.now();
    const amounts: Record<string, number> = {};
    this.chart.vehicles.forEach((v) => (amounts[v.id] = 0));
    this.chart.surcharges.push({ id, label: 'New Surcharge', amounts });
  }

  removeSurcharge(s: RcSurcharge) {
    this.chart.surcharges = this.chart.surcharges.filter((x) => x.id !== s.id);
  }

  addNote() {
    this.chart.notes.push({ icon: '★', title: 'Note', content: '' });
  }

  removeNote(n: RcNote) {
    this.chart.notes = this.chart.notes.filter((x) => x !== n);
  }

  // ── Save ─────────────────────────────────────────────────────
  save() {
    this.saving = true;
    this._rcService.save(this.chart).subscribe({
      next: (saved) => {
        this.chart = saved;
        this.isNew = false;
        this.editMode = false;
        this.saving = false;
        this._router.navigate(['/business-hub/rate-charts', this.chart.id]);
      },
      error: () => { this.saving = false; },
    });
  }

  // ── PDF download ─────────────────────────────────────────────
  async downloadPDF() {
    this.pdfLoading = true;
    try {
      const el = this.paperRef.nativeElement;

      // 1. Force desktop width so mobile layout doesn't produce a narrow PDF
      const origWidth    = el.style.width;
      const origOverflow = el.style.overflow;
      const origMaxWidth = el.style.maxWidth;
      el.style.width    = '1100px';
      el.style.maxWidth = 'none';
      el.style.overflow = 'visible';
      // Wait one frame for the layout reflow
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      // 2. Capture the full element — not just the visible viewport
      const { default: html2canvasFn } = await import('html2canvas');
      const canvas = await html2canvasFn(el, {
        scale:        3,           // high DPI — sharp text
        useCORS:      true,
        allowTaint:   true,
        scrollX:      0,
        scrollY:      0,
        windowWidth:  1100,
        windowHeight: el.scrollHeight,
        height:       el.scrollHeight,
        width:        el.scrollWidth,
      });

      // 3. Restore original styles immediately after capture
      el.style.width    = origWidth;
      el.style.maxWidth = origMaxWidth;
      el.style.overflow = origOverflow;

      // 4. Build multi-page A4 PDF
      const { jsPDF } = await import('jspdf') as any;
      const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();   // 210 mm
      const pdfH = pdf.internal.pageSize.getHeight();  // 297 mm

      // How many canvas pixels equal one mm
      const pxPerMm      = canvas.width / pdfW;
      const pageHeightPx = pdfH * pxPerMm;            // canvas rows per A4 page
      const totalPages   = Math.ceil(canvas.height / pageHeightPx);

      for (let page = 0; page < totalPages; page++) {
        const srcY = Math.floor(page * pageHeightPx);
        const srcH = Math.min(Math.ceil(pageHeightPx), canvas.height - srcY);
        if (srcH <= 0) break;

        // Slice the main canvas into a page-height strip
        const slice = document.createElement('canvas');
        slice.width  = canvas.width;
        slice.height = srcH;
        const ctx = slice.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const imgData  = slice.toDataURL('image/png');
        const sliceImgH = srcH / pxPerMm;   // mm height of this slice

        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, sliceImgH);

        // Page number footer (only when multi-page)
        if (totalPages > 1) {
          pdf.setFontSize(7);
          pdf.setTextColor(160, 160, 160);
          pdf.text(
            `Page ${page + 1} of ${totalPages}`,
            pdfW / 2,
            pdfH - 3,
            { align: 'center' }
          );
        }
      }

      await this._pdfDownload.downloadDoc(pdf, `${this.chart.templateName.replace(/\s+/g, '_')}_Rate_Chart.pdf`);
    } catch (e) {
      console.error('PDF error', e);
    }
    this.pdfLoading = false;
  }

  // ── Share ────────────────────────────────────────────────────
  shareWhatsApp() {
    const text = encodeURIComponent(
      `Hi! Here is our rate chart "${this.chart.templateName}" valid ${this.chart.validFrom} to ${this.chart.validTo}. Contact us at ${this.chart.footer.phone} for bookings.`
    );
    const phone = this.chart.agentNumber
      ? this.chart.agentNumber.replace(/\D/g, '')
      : '';
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  }

  shareEmail() {
    const sub = encodeURIComponent(`Rate Chart – ${this.chart.templateName}`);
    const body = encodeURIComponent(
      `Please find the rate chart "${this.chart.templateName}" valid from ${this.chart.validFrom} to ${this.chart.validTo}.\n\nContact: ${this.chart.footer.phone} | ${this.chart.footer.email}`
    );
    window.open(`mailto:?subject=${sub}&body=${body}`, '_blank');
  }

  goBack() {
    this._router.navigate(['/business-hub/rate-charts']);
  }
}

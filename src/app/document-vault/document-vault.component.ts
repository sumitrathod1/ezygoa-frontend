import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VehicleService } from '../services/vehicle.service';
import { ToastrService } from 'ngx-toastr';
import { DocumentFormComponent } from '../vehicle/document-form/document-form.component';

type ExpiryClass = 'exp-expired' | 'exp-critical' | 'exp-soon' | 'exp-warning' | 'exp-valid' | 'exp-none';
type CategoryTab = 'all' | 'vehicle' | 'driver' | 'company';
type StatusFilter = 'all' | 'valid' | 'expiring' | 'expired';

interface ExpiryInfo { label: string; cls: ExpiryClass; days: number | null; }

@Component({
  selector: 'app-document-vault',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-vault.component.html',
  styleUrl: './document-vault.component.css',
})
export class DocumentVaultComponent implements OnInit {
  documents: any[] = [];
  loading = true;
  viewMode: 'card' | 'list' = 'card';
  activeCategory: CategoryTab = 'all';
  statusFilter: StatusFilter = 'all';
  searchQuery = '';
  sortBy: 'expiry' | 'name' = 'expiry';

  constructor(
    private _vehicleService: VehicleService,
    private _dialog: MatDialog,
    private _toastr: ToastrService,
    private _router: Router,
  ) {}

  ngOnInit() { this.loadDocuments(); }

  loadDocuments() {
    this.loading = true;
    this._vehicleService.getAllDocuments().subscribe({
      next: (data: any) => {
        this.documents = Array.isArray(data) ? data : (data?.data ?? []);
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Expiry calculation ────────────────────────────────────────
  getExpiryInfo(doc: any): ExpiryInfo {
    if (!doc.hasExpiry && doc.hasExpiry !== undefined) {
      return { label: 'No Expiry', cls: 'exp-none', days: null };
    }
    if (!doc.expiryDate) {
      return { label: 'No Expiry', cls: 'exp-none', days: null };
    }
    const days = Math.floor(
      (new Date(doc.expiryDate).getTime() - Date.now()) / 86400000
    );
    if (days < 0)   return { label: `Expired ${Math.abs(days)}d ago`, cls: 'exp-expired', days };
    if (days <= 7)  return { label: `${days}d left`,  cls: 'exp-critical', days };
    if (days <= 30) return { label: `${days}d left`,  cls: 'exp-soon',     days };
    if (days <= 60) return { label: `${days}d left`,  cls: 'exp-warning',  days };
    return           { label: 'Valid',                cls: 'exp-valid',    days };
  }

  // ── Stats ────────────────────────────────────────────────────
  get stats() {
    let valid = 0, expiring = 0, expired = 0;
    for (const d of this.documents) {
      const cls = this.getExpiryInfo(d).cls;
      if (cls === 'exp-expired')                          expired++;
      else if (cls === 'exp-critical' || cls === 'exp-soon' || cls === 'exp-warning') expiring++;
      else                                                valid++;
    }
    return { total: this.documents.length, valid, expiring, expired };
  }

  // ── Category counts ──────────────────────────────────────────
  categoryCount(cat: CategoryTab): number {
    if (cat === 'all') return this.documents.length;
    return this.documents.filter(
      (d) => (d.category || 'Vehicle').toLowerCase() === cat
    ).length;
  }

  // ── Filtered list ────────────────────────────────────────────
  get filteredDocuments(): any[] {
    let result = [...this.documents];

    if (this.activeCategory !== 'all') {
      result = result.filter(
        (d) => (d.category || 'Vehicle').toLowerCase() === this.activeCategory
      );
    }

    if (this.statusFilter !== 'all') {
      result = result.filter((d) => {
        const cls = this.getExpiryInfo(d).cls;
        switch (this.statusFilter) {
          case 'valid':    return cls === 'exp-valid' || cls === 'exp-none';
          case 'expiring': return cls === 'exp-critical' || cls === 'exp-soon' || cls === 'exp-warning';
          case 'expired':  return cls === 'exp-expired';
          default:         return true;
        }
      });
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title?.toLowerCase().includes(q) ||
          d.documentType?.toLowerCase().includes(q) ||
          d.documentNumber?.toLowerCase().includes(q) ||
          d.vehicle?.vehicleName?.toLowerCase().includes(q) ||
          d.vehicle?.vehicleNumber?.toLowerCase().includes(q) ||
          d.driverName?.toLowerCase().includes(q) ||
          d.issuedBy?.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (this.sortBy === 'expiry') {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      }
      return (a.documentType || a.title || '').localeCompare(b.documentType || b.title || '');
    });

    return result;
  }

  // ── Display helpers ──────────────────────────────────────────
  getDocTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'Insurance':          'bi-shield-check',
      'PUC':                'bi-cloud-check',
      'Registration':       'bi-card-text',
      'Permit':             'bi-patch-check',
      'Fitness':            'bi-heart-pulse',
      'Road Tax':           'bi-receipt',
      'Driving Licence':    'bi-person-badge',
      'Aadhar Card':        'bi-person-vcard',
      'Police Verification':'bi-shield-lock',
      'Badge':              'bi-award',
      'Business Permit':    'bi-building',
      'GST Certificate':    'bi-receipt-cutoff',
      'Trade Licence':      'bi-briefcase',
    };
    return icons[type] || 'bi-file-earmark-text';
  }

  getEntityLabel(doc: any): string {
    if (doc.vehicle?.vehicleName) {
      return doc.vehicle.vehicleNumber
        ? `${doc.vehicle.vehicleName} · ${doc.vehicle.vehicleNumber}`
        : doc.vehicle.vehicleName;
    }
    if (doc.driverName) return doc.driverName;
    return 'Company';
  }

  getCategoryIcon(cat: string): string {
    if (cat === 'Driver') return 'bi-person-badge-fill';
    if (cat === 'Company') return 'bi-building-fill';
    return 'bi-car-front-fill';
  }

  // ── Actions ──────────────────────────────────────────────────
  openAddForm() {
    const ref = this._dialog.open(DocumentFormComponent, {
      data: {},
      maxWidth: '480px',
      width: '95vw',
    });
    ref.afterClosed().subscribe(() => this.loadDocuments());
  }

  editDocument(doc: any) {
    const ref = this._dialog.open(DocumentFormComponent, {
      data: { document: doc },
      maxWidth: '480px',
      width: '95vw',
    });
    ref.afterClosed().subscribe(() => this.loadDocuments());
  }

  deleteDocument(doc: any) {
    if (!confirm(`Delete "${doc.documentType || doc.title}"?`)) return;
    this._vehicleService.deleteDocument(doc.documentID).subscribe({
      next: () => {
        this._toastr.success('Document deleted', 'Deleted');
        this.loadDocuments();
      },
      error: () => this._toastr.error('Could not delete document', 'Error'),
    });
  }

  // ── Share / Export ───────────────────────────────────────────
  shareExpiryListWhatsApp() {
    const alerts = this.documents
      .filter((d) => {
        const cls = this.getExpiryInfo(d).cls;
        return cls === 'exp-expired' || cls === 'exp-critical' || cls === 'exp-soon';
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    if (!alerts.length) {
      this._toastr.info('No expiring/expired documents to share!', 'All Clear');
      return;
    }

    let text = '⚠️ *Document Expiry Alert – EZY GOA TRAVELS*\n\n';
    for (const d of alerts) {
      const info = this.getExpiryInfo(d);
      const entity = this.getEntityLabel(d);
      const dt = d.expiryDate
        ? new Date(d.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
        : 'No date';
      text += `📋 *${d.documentType || d.title}* — ${entity}\n`;
      text += `   ${info.label} | Expiry: ${dt}\n\n`;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  exportCSV() {
    const headers = ['Title', 'Category', 'Doc Type', 'Vehicle / Driver', 'Doc Number', 'Issued By', 'Issue Date', 'Expiry Date', 'Status'];
    const rows = this.filteredDocuments.map((d) => {
      const info = this.getExpiryInfo(d);
      return [
        d.title || '',
        d.category || 'Vehicle',
        d.documentType || '',
        this.getEntityLabel(d),
        d.documentNumber || '',
        d.issuedBy || '',
        d.issueDate ? new Date(d.issueDate).toLocaleDateString('en-IN') : '',
        d.expiryDate ? new Date(d.expiryDate).toLocaleDateString('en-IN') : 'No Expiry',
        info.label,
      ].map((v) => `"${v}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Document_Vault.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  goBack() { this._router.navigate(['/business-hub']); }
}

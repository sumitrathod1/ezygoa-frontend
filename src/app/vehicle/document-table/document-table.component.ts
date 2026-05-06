import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VehicleService } from '../../services/vehicle.service';

@Component({
  selector: 'app-document-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document-table.component.html',
  styleUrl: './document-table.component.css',
})
export class DocumentTableComponent {
  documents: any[] = [];
  searchQuery = '';

  constructor(private _vehiclService: VehicleService) {}

  ngOnInit() {
    this.loadDocuments();
  }

  loadDocuments() {
    this._vehiclService.getAllDocuments().subscribe({
      next: (data: any) => {
        this.documents = Array.isArray(data) ? data : [];
      },
    });
  }

  get filteredDocuments() {
    if (!this.searchQuery.trim()) return this.documents;
    const q = this.searchQuery.toLowerCase();
    return this.documents.filter(
      (d) =>
        d.vehicle?.vehicleName?.toLowerCase().includes(q) ||
        d.title?.toLowerCase().includes(q) ||
        d.documentType?.toLowerCase().includes(q)
    );
  }

  getExpiryStatus(dateStr: string): { label: string; cls: string } {
    if (!dateStr) return { label: 'No expiry', cls: 'exp-none' };
    const expiry = new Date(dateStr);
    const now = new Date();
    const days = Math.floor(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0) return { label: 'Expired', cls: 'exp-expired' };
    if (days <= 30) return { label: `${days}d left`, cls: 'exp-soon' };
    return { label: 'Valid', cls: 'exp-valid' };
  }

  getDocIcon(type: string): string {
    const map: Record<string, string> = {
      Insurance: 'bi-shield-check',
      PUC: 'bi-cloud-check',
      Registration: 'bi-card-text',
      Permit: 'bi-patch-check',
      Fitness: 'bi-heart-pulse',
    };
    return map[type] || 'bi-file-earmark-text';
  }
}

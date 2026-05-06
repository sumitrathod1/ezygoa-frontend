import { Component, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AgentService } from '../services/agent.service';
import { ToastrService } from 'ngx-toastr';
import { ReportFormComponent } from './report-form/report-form.component';

const TYPE_LABELS: Record<string, string> = {
  Agent: 'Agent', TravelOwner: 'Travel Owner',
  Hotel: 'Hotel', TourOperator: 'Tour Operator',
  TravelAgency: 'Travel Agency', OnlinePlatform: 'Online Platform',
  Individual: 'Individual',
};

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.css',
})
export class AgentsComponent implements OnInit {

  agents: any[] = [];
  loading = false;

  searchQuery  = '';
  filterType   = 'all';
  filterStatus = 'all';
  sortBy       = 'bookings';

  agentTypes = ['Hotel', 'TourOperator', 'TravelAgency', 'OnlinePlatform', 'Individual', 'Agent', 'TravelOwner'];
  paymentTermsList = ['Per Booking', 'Weekly', 'Monthly'];

  // ── Add / Edit form ───────────────────────────────────────────
  showForm       = false;
  isEdit         = false;
  editingId: number | null = null;
  formSaving     = false;
  formData = this._emptyForm();

  // ── Payment modal ─────────────────────────────────────────────
  @ViewChild('paymentModal') paymentModal!: ElementRef;
  paymentData = { agentId: 0, totalPaidAmount: 0 };

  constructor(
    private _router: Router,
    private _dialog: MatDialog,
    private _agents: AgentService,
    private _toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.getAllAgents();
    this._agents.agentUpdated$.subscribe(() => this.getAllAgents());
  }

  // ── Data ──────────────────────────────────────────────────────
  getAllAgents() {
    this.loading = true;
    this._agents.getAllAgents().subscribe({
      next: (data: any) => {
        const raw: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        this.agents = raw;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  // ── Computed ──────────────────────────────────────────────────
  get filtered(): any[] {
    const q = this.searchQuery.toLowerCase();
    return this.agents
      .filter(a => {
        if (q && !(
          (a.name ?? '').toLowerCase().includes(q) ||
          (a.contactNumber ?? '').includes(q) ||
          (a.email ?? '').toLowerCase().includes(q) ||
          (a.address ?? '').toLowerCase().includes(q)
        )) return false;
        if (this.filterType !== 'all' && (a.type ?? '') !== this.filterType) return false;
        if (this.filterStatus === 'active'   && !a.isActive) return false;
        if (this.filterStatus === 'inactive' &&  a.isActive) return false;
        return true;
      })
      .sort((a, b) => {
        if (this.sortBy === 'name')     return (a.name ?? '').localeCompare(b.name ?? '');
        if (this.sortBy === 'revenue')  return (b.earned ?? 0)       - (a.earned ?? 0);
        if (this.sortBy === 'pending')  return (b.pending ?? 0)      - (a.pending ?? 0);
        return (b.bookingCount ?? 0) - (a.bookingCount ?? 0);
      });
  }

  get totalEarned():   number { return this.agents.reduce((s, a) => s + (a.earned  ?? 0), 0); }
  get totalPending():  number { return this.agents.reduce((s, a) => s + (a.pending ?? 0), 0); }
  get activeCount():   number { return this.agents.filter(a => a.isActive !== false).length; }
  get topAgent(): any | null  {
    if (!this.agents.length) return null;
    return this.agents.reduce((top, a) => (a.bookingCount ?? 0) > (top.bookingCount ?? 0) ? a : top);
  }

  typeLabel(t: string): string { return TYPE_LABELS[t] ?? t; }

  agentInitials(name: string): string {
    return (name ?? 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  // ── Add / Edit form ───────────────────────────────────────────
  private _emptyForm() {
    return {
      name: '', contactNumber: '', email: '', agentType: 'Hotel',
      contactPerson: '', whatsApp: '', address: '',
      commissionPercent: 0, paymentTerms: 'Monthly',
      bankAccount: '', ifsc: '', notes: '', isActive: true,
    };
  }

  openAddForm() {
    this.formData    = this._emptyForm();
    this.isEdit      = false;
    this.editingId   = null;
    this.showForm    = true;
  }

  openEditForm(a: any) {
    this.formData = {
      name:              a.name             ?? '',
      contactNumber:     a.contactNumber    ?? '',
      email:             a.email            ?? '',
      agentType:         a.type             ?? 'Hotel',
      contactPerson:     a.contactPerson    ?? '',
      whatsApp:          a.whatsApp         ?? '',
      address:           a.address          ?? '',
      commissionPercent: a.commissionPercent ?? 0,
      paymentTerms:      a.paymentTerms     ?? 'Monthly',
      bankAccount:       a.bankAccount      ?? '',
      ifsc:              a.ifsc             ?? '',
      notes:             a.notes            ?? '',
      isActive:          a.isActive !== false,
    };
    this.isEdit    = true;
    this.editingId = a.agentId;
    this.showForm  = true;
  }

  closeForm() { this.showForm = false; }

  submitForm() {
    if (!this.formData.name.trim()) return;
    this.formSaving = true;
    const call = this.isEdit && this.editingId != null
      ? this._agents.updateAgent(this.editingId, this.formData)
      : this._agents.addAgetn(this.formData);

    call.subscribe({
      next: () => {
        this._toastr.success(this.isEdit ? 'Agent updated' : 'Agent added', 'Success');
        this.closeForm();
        this.getAllAgents();
        this.formSaving = false;
      },
      error: () => { this.formSaving = false; },
    });
  }

  // ── Payment modal ─────────────────────────────────────────────
  openPaymentModal(agentId: number) {
    this.paymentData = { agentId, totalPaidAmount: 0 };
    const el = this.paymentModal.nativeElement;
    const modal = (window as any).bootstrap.Modal.getInstance(el) || new (window as any).bootstrap.Modal(el);
    modal.show();
  }

  submitPayment() {
    const el = this.paymentModal.nativeElement;
    const modal = (window as any).bootstrap.Modal.getInstance(el) || new (window as any).bootstrap.Modal(el);
    this._agents.addPayment(this.paymentData).subscribe({
      next: () => {
        this._toastr.success('Payment added successfully', 'Success');
        this.paymentData.totalPaidAmount = 0;
        modal.hide();
        this.getAllAgents();
      },
      error: (err: any) => {
        this._toastr.error('Error adding payment', err);
        modal.hide();
      },
    });
  }

  // ── Navigation / actions ──────────────────────────────────────
  viewAllBookings(agentId: number) { this._router.navigate(['/agent-details', agentId]); }

  downloadReport(agentId: number) {
    this._dialog.open(ReportFormComponent, { data: { agentId } });
  }

  callAgent(phone: string) { window.open(`tel:${phone}`); }

  whatsAppAgent(phone: string, name: string) {
    const p = phone.replace(/\D/g, '');
    const num = p.length === 10 ? '91' + p : p;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hi ${name}, `)}`, '_blank');
  }

  emailAgent(email: string) { window.open(`mailto:${email}`); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.showForm) this.closeForm(); }
}

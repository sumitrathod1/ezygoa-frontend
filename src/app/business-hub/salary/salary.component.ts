import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SalaryService } from '../../services/salary.service';
import { EmployeeService } from '../../services/employee.service';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

@Component({
  selector: 'app-salary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.css',
})
export class SalaryComponent implements OnInit {
  records: any[] = [];
  loading = false;
  generating = false;

  filterMonth = new Date().getMonth() + 1;
  filterYear  = new Date().getFullYear();

  showCreateForm  = false;
  createData = {
    userID: 0,
    month:  new Date().getMonth() + 1,
    year:   new Date().getFullYear(),
    baseSalay:   0,
    deduction:   0,
    overtimepay: 0,
  };

  showPayModal    = false;
  selectedRecord: any = null;
  payNotes = '';

  months = MONTHS;
  years  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // ── Employee dropdown state ───────────────────────────────────
  employees:       any[]   = [];
  empSearch        = '';
  selectedEmployee: any    = null;
  showEmpList      = false;

  constructor(
    private _salaryService:   SalaryService,
    private _employeeService: EmployeeService,
    private _router: Router,
  ) {}

  ngOnInit() {
    this.load();
    this.loadEmployees();
  }

  // ── Data loaders ──────────────────────────────────────────────
  load() {
    this.loading = true;
    this._salaryService.getAll().subscribe({
      next: (data) => { this.records = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadEmployees() {
    this._employeeService.getAllEmployees().subscribe({
      next: (res: any) => {
        const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        // only active employees / drivers, skip admins for payroll
        this.employees = raw.filter((e) => e.status !== false);
      },
    });
  }

  // ── Computed ──────────────────────────────────────────────────
  get filtered(): any[] {
    return this.records
      .filter((r) => r.month === this.filterMonth && r.year === this.filterYear)
      .sort((a, b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? 1 : -1));
  }

  get totalNet():     number { return this.filtered.reduce((s, r) => s + (r.netSalaey ?? 0), 0); }
  get totalPaid():    number { return this.filtered.filter((r) => r.isPaid ).reduce((s, r) => s + (r.netSalaey ?? 0), 0); }
  get totalPending(): number { return this.filtered.filter((r) => !r.isPaid).reduce((s, r) => s + (r.netSalaey ?? 0), 0); }

  get filteredEmployees(): any[] {
    const q = this.empSearch.toLowerCase();
    return this.employees.filter((e) =>
      (e.employeeName ?? e.EmployeeName ?? '').toLowerCase().includes(q)
    );
  }

  monthLabel(m: number) { return MONTHS[m - 1] ?? m; }

  isAutoRecord(r: any): boolean {
    return !!(r.notes ?? '').toLowerCase().startsWith('auto:');
  }

  nextAutoDate(r: any): string {
    const day = r.user?.salaryDay ?? r.user?.SalaryDay;
    if (!day) return '';
    const now = new Date();
    let month = now.getMonth();
    let year  = now.getFullYear();
    if (now.getDate() >= day) { month++; if (month > 11) { month = 0; year++; } }
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  empRoleLabel(e: any): string {
    const role    = (e.role ?? e.Role ?? '').toString().toLowerCase();
    const licence = e.licence ?? e.Licence;
    if (role === 'admin' || role === '1') return 'Admin';
    if (licence !== null && licence !== undefined && licence !== '') return 'Driver';
    return 'Employee';
  }

  empName(e: any): string {
    return e.employeeName ?? e.EmployeeName ?? `User #${e.userId ?? e.UserId}`;
  }

  // ── Employee dropdown actions ─────────────────────────────────
  onEmpFocus() { this.showEmpList = true; }

  onEmpSearch() { this.showEmpList = true; }

  selectEmployee(emp: any) {
    this.selectedEmployee     = emp;
    this.empSearch            = this.empName(emp);
    this.showEmpList          = false;
    this.createData.userID    = emp.userId ?? emp.UserId ?? 0;
    this.createData.baseSalay = emp.salary ?? emp.Salary ?? 0;
  }

  clearEmployee() {
    this.selectedEmployee  = null;
    this.empSearch         = '';
    this.createData.userID = 0;
    this.createData.baseSalay = 0;
    this.showEmpList = false;
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.sal-emp-wrap')) {
      this.showEmpList = false;
    }
  }

  // ── Actions ───────────────────────────────────────────────────
  generateMonth() {
    this.generating = true;
    this._salaryService.generateMonth(this.filterMonth, this.filterYear).subscribe({
      next: (_) => { this.generating = false; this.load(); },
      error: () => { this.generating = false; },
    });
  }

  openCreate() {
    this.createData = {
      userID:      0,
      month:       this.filterMonth,
      year:        this.filterYear,
      baseSalay:   0,
      deduction:   0,
      overtimepay: 0,
    };
    this.selectedEmployee = null;
    this.empSearch        = '';
    this.showEmpList      = false;
    this.showCreateForm   = true;
  }

  submitCreate() {
    if (!this.createData.userID) return;
    const net     = (this.createData.baseSalay + this.createData.overtimepay) - this.createData.deduction;
    const payload = { ...this.createData, netSalaey: net, isPaid: false };
    this._salaryService.create(payload).subscribe({
      next: () => { this.showCreateForm = false; this.load(); },
    });
  }

  openPayModal(r: any) {
    this.selectedRecord = r;
    this.payNotes = '';
    this.showPayModal = true;
  }

  confirmPay() {
    if (!this.selectedRecord) return;
    this._salaryService.markPaid(this.selectedRecord.salaryId, this.payNotes || undefined).subscribe({
      next: () => { this.showPayModal = false; this.selectedRecord = null; this.load(); },
    });
  }

  goBack() { this._router.navigate(['/business-hub']); }
}

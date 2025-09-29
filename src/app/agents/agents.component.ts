import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AgentFormComponent } from './agent-form/agent-form.component';
import { CommonModule } from '@angular/common';
import { AgentService } from '../services/agent.service';
import { FormsModule } from '@angular/forms';
import { ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { ReportFormComponent } from './report-form/report-form.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-agents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agents.component.html',
  styleUrl: './agents.component.css',
})
export class AgentsComponent {
  agents: any = [];

  totalRevenue: number = 0;
  pendingAmount: number = 0;
  agentCount: number = 0;
  totalBookings: number = 0;

  get totalRevenueAmount() {
    return this.totalRevenue;
  }
  get totalPendingAmount() {
    return this.pendingAmount;
  }
  constructor(
    private route: Router,
    private _dilog: MatDialog,
    private _agents: AgentService,
    private _toaster: ToastrService
  ) {}
  onAgentClick() {
    this._dilog.open(AgentFormComponent);
    console.log('Agent clicked');

    this.getAllAgents();
  }

  ngOnInit() {
    this.getAllAgents();
    this._agents.agentUpdated$.subscribe(() => {
      this.getAllAgents();
    });
  }

  getAllAgents() {
    this._agents.getAllAgents().subscribe({
      next: (data) => {
        this.agents = data;
        this.agentCount = this.agents.length;
        this.totalRevenue = data.reduce(
          (sum: number, agent: any) => sum + (agent.earned || 0),
          0
        );
        this.pendingAmount = data.reduce(
          (sum: number, agent: any) => sum + (agent.pending || 0),
          0
        );
      },
      error: (error) => {
        console.error('Error fetching agents:', error);
      },
    });
  }
  @ViewChild('paymentModal', { static: false }) paymentModal!: ElementRef;

  paymentData = {
    agentId: 0,
    totalPaidAmount: 0,
  };

  openPaymentModal(agentId: number) {
    this.paymentData.agentId = agentId;

    const modalElement = this.paymentModal.nativeElement;
    const modal =
      (window as any).bootstrap.Modal.getInstance(modalElement) ||
      new (window as any).bootstrap.Modal(modalElement);
    modal.show();
  }

  submitPayment() {
    const modalElement = this.paymentModal.nativeElement;
    const modal =
      (window as any).bootstrap.Modal.getInstance(modalElement) ||
      new (window as any).bootstrap.Modal(modalElement);
    this._agents.addPayment(this.paymentData).subscribe({
      next: (res) => {
        this._toaster.success('Payment added successfully', 'Success');
        this.paymentData.totalPaidAmount = 0;

        this.getAllAgents();
      },
      error: (err) => {
        this._toaster.error('Error adding payment', err);
        const modalElement = this.paymentModal.nativeElement;
        const modal =
          (window as any).bootstrap.Modal.getInstance(modalElement) ||
          new (window as any).bootstrap.Modal(modalElement);
        modal.hide();
      },
    });
    modal.hide();
  }

  addAgent() {
    this._dilog.open(AgentFormComponent);
  }
  viewAllBookings(agentId: number) {
    this.route.navigate(['/agent-details', agentId]);
  }

  downloadReport(agentId: number) {
    this._dilog.open(ReportFormComponent, {
      data: { agentId: agentId },
    });
  }
}

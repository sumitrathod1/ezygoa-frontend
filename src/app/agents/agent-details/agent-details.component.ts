import { Component, OnInit } from '@angular/core';
import { AgentService } from '../../services/agent.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-agent-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-details.component.html',
  styleUrl: './agent-details.component.css',
})
export class AgentDetailsComponent implements OnInit {
  agentId!: number;
  agent: any = null;
  bookings: any[] = [];

  totalRevenue = 0;
  totalCommission = 0;
  outstandingBalance = 0;

  constructor(
    private route: ActivatedRoute,
    private _agentService: AgentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.agentId = Number(params.get('id'));
      if (this.agentId) {
        this.loadAgent();
        this.loadBookings();
      }
    });
  }

  loadAgent() {
    this._agentService.getAllAgents().subscribe({
      next: (data: any) => {
        const all: any[] = Array.isArray(data) ? data : (data?.data ?? []);
        this.agent = all.find(a => (a.agentId ?? a.AgentId) === this.agentId) ?? null;
        this.computeStats();
      },
    });
  }

  loadBookings() {
    this._agentService.getBookingByAgentsID(this.agentId).subscribe({
      next: (data: any) => {
        this.bookings = Array.isArray(data) ? data : (data?.data ?? []);
        this.computeStats();
      },
    });
  }

  computeStats() {
    this.totalRevenue = this.bookings.reduce((s, b) => s + (b.amount || 0), 0);
    const pct = this.agent?.commissionPercent ?? 0;
    this.totalCommission = Math.round(this.totalRevenue * pct / 100);
    this.outstandingBalance = this.agent?.balance ?? 0;
  }

  commissionForBooking(b: any): number {
    const pct = this.agent?.commissionPercent ?? 0;
    return Math.round((b.amount || 0) * pct / 100);
  }

  formatTime(time?: string | null): string {
    if (!time) return '';
    const parts = time.split(':');
    if (parts.length < 2) return time;
    const h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, '0');
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m} ${suffix}`;
  }

  getInitials(name: string): string {
    if (!name?.trim()) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RateChartService } from '../../services/rate-chart.service';
import { RateChart } from '../../models/rate-chart.model';

@Component({
  selector: 'app-rate-chart-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rate-chart-list.component.html',
  styleUrl: './rate-chart-list.component.css',
})
export class RateChartListComponent {
  charts: RateChart[] = [];
  searchQuery = '';
  sortBy: 'name' | 'date' = 'date';
  loading = true;

  constructor(
    private _rcService: RateChartService,
    private _router: Router
  ) {}

  ngOnInit() {
    this.loadCharts();
  }

  loadCharts() {
    this.loading = true;
    this._rcService.getAll().subscribe({
      next: (data) => {
        this.charts = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  get filteredCharts() {
    let result = [...this.charts];
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.templateName?.toLowerCase().includes(q) ||
          c.agentName?.toLowerCase().includes(q)
      );
    }
    if (this.sortBy === 'name') {
      result.sort((a, b) => a.templateName.localeCompare(b.templateName));
    } else {
      result.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }
    return result;
  }

  getStatus(chart: RateChart): { label: string; cls: string } {
    if (this._rcService.isExpired(chart)) return { label: 'Expired', cls: 'status-expired' };
    if (this._rcService.isExpiringSoon(chart)) return { label: 'Expiring Soon', cls: 'status-soon' };
    return { label: 'Active', cls: 'status-active' };
  }

  createNew() {
    this._router.navigate(['/business-hub/rate-charts/new']);
  }

  editChart(chart: RateChart) {
    this._router.navigate(['/business-hub/rate-charts', chart.id]);
  }

  duplicateChart(chart: RateChart, event: Event) {
    event.stopPropagation();
    const copy = this._rcService.duplicate(chart);
    this._rcService.save(copy).subscribe(() => this.loadCharts());
  }

  deleteChart(chart: RateChart, event: Event) {
    event.stopPropagation();
    if (!confirm(`Delete "${chart.templateName}"?`)) return;
    this._rcService.delete(chart.id).subscribe(() => this.loadCharts());
  }

  goBack() {
    this._router.navigate(['/business-hub']);
  }
}

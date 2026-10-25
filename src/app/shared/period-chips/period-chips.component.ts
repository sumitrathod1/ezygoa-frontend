import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type PeriodKey = 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';
export interface PeriodRange {
  key: PeriodKey;
  /** yyyy-MM-dd */
  from: string;
  to: string;
}

/** yyyy-MM-dd in local time (toISOString gives yesterday before 5:30 am in India) */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The dates a period chip stands for, as of `now` */
export function periodRange(key: PeriodKey, now = new Date(), custom?: { from: string; to: string }): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const today = localIso(now);
  switch (key) {
    case 'week': {
      const from = new Date(now);
      from.setDate(now.getDate() - 6);
      return { key, from: localIso(from), to: today };
    }
    case 'lastMonth':
      return { key, from: localIso(new Date(y, m - 1, 1)), to: localIso(new Date(y, m, 0)) };
    case 'quarter':
      return { key, from: localIso(new Date(y, Math.floor(m / 3) * 3, 1)), to: today };
    case 'year':
      return { key, from: localIso(new Date(y, 0, 1)), to: today };
    case 'custom':
      return { key, from: custom?.from || localIso(new Date(y, m, 1)), to: custom?.to || today };
    default:
      return { key: 'month', from: localIso(new Date(y, m, 1)), to: today };
  }
}

/**
 * Period chips (Last 7 days · This month · Last month · This quarter · This year · Custom)
 * in one scrollable row. Emits the chosen dates; emits once on start with the initial period.
 */
@Component({
  selector: 'app-period-chips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pc-chips" role="tablist">
      <button *ngFor="let p of periods" type="button" class="pc-chip" role="tab"
              [class.active]="key === p.key" [attr.aria-selected]="key === p.key" (click)="pick(p.key)">{{ p.label }}</button>
    </div>
    <div class="pc-custom" *ngIf="key === 'custom'">
      <label>From <input type="date" [(ngModel)]="customFrom" /></label>
      <label>To <input type="date" [(ngModel)]="customTo" /></label>
      <button type="button" class="pc-apply" (click)="applyCustom()">Apply</button>
      <span class="pc-err" *ngIf="error">{{ error }}</span>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .pc-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
    .pc-chips::-webkit-scrollbar { display: none; }
    .pc-chip {
      flex-shrink: 0; padding: 6px 13px; border-radius: 999px; border: 1.5px solid #c7d2fe; background: #fff;
      color: #4338ca; font-size: 13px; font-weight: 600; white-space: nowrap; cursor: pointer;
    }
    .pc-chip.active { background: #4b2aad; border-color: #4b2aad; color: #fff; }
    .pc-custom { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-end; margin-top: 10px; }
    .pc-custom label { display: flex; flex-direction: column; gap: 3px; font-size: 12px; font-weight: 600; color: #475569; margin: 0; }
    .pc-custom input { border: 1px solid #cbd5e1; border-radius: 8px; padding: 7px 8px; font-size: 14px; }
    .pc-apply { border: none; background: #4b2aad; color: #fff; border-radius: 10px; padding: 8px 16px; font-weight: 700; }
    .pc-err { color: #b91c1c; font-size: 12.5px; flex-basis: 100%; }
  `],
})
export class PeriodChipsComponent implements OnInit {
  @Input() key: PeriodKey = 'month';
  @Output() changed = new EventEmitter<PeriodRange>();

  customFrom = '';
  customTo = '';
  error = '';

  readonly periods: { key: PeriodKey; label: string }[] = [
    { key: 'week', label: 'Last 7 days' },
    { key: 'month', label: 'This month' },
    { key: 'lastMonth', label: 'Last month' },
    { key: 'quarter', label: 'This quarter' },
    { key: 'year', label: 'This year' },
    { key: 'custom', label: 'Custom' },
  ];

  ngOnInit() {
    if (this.key !== 'custom') this.changed.emit(periodRange(this.key));
  }

  pick(key: PeriodKey) {
    this.key = key;
    this.error = '';
    if (key !== 'custom') this.changed.emit(periodRange(key));
  }

  applyCustom() {
    if (!this.customFrom || !this.customTo) {
      this.error = 'Choose both dates.';
      return;
    }
    if (this.customFrom > this.customTo) {
      this.error = "'From' must be before 'To'.";
      return;
    }
    this.error = '';
    this.changed.emit(periodRange('custom', new Date(), { from: this.customFrom, to: this.customTo }));
  }
}

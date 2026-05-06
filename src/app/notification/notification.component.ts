import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { EmailServiceService } from '../services/email-service.service';

export type NotificationKind = 'Inquiries' | 'Payments' | 'Updates' | 'All';

export interface NotificationItem {
  id: string;
  title: string;
  Message: string;
  category: NotificationKind;
  createdAt: Date;
  isRead: boolean;
  actionLabel?: string;
  actionUrl?: string;
  colorTag?: string;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatChipsModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatMenuModule,
    MatTooltipModule,
    MatBadgeModule,
    MatRippleModule,
  ],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
})
export class NotificationComponent {
  filter: NotificationKind | 'All' = 'All';
  notifications: NotificationItem[] = [];
  isLoading = false;

  private cdr = inject(ChangeDetectorRef);

  get filteredNotifications(): NotificationItem[] {
    if (this.filter === 'All') return this.notifications;
    return this.notifications.filter((n) => n.category === this.filter);
  }

  constructor(private _emailService: EmailServiceService) {}

  ngOnInit() {
    this.getNotifications();
  }

  getNotifications() {
    this.isLoading = true;
    this._emailService.getNotification().subscribe({
      next: (res: any[]) => {
        this.notifications = res.map((n) => ({
          id: n.notificationId || n.NotificationId,
          title: 'Inquiries',
          Message: n.message,
          category: 'Inquiries' as NotificationKind,
          createdAt: new Date(n.createdAt),
          isRead: n.isRead,
          colorTag: n.isRead ? '#9E9E9E' : '#2196F3',
        }));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  setFilter(kind: NotificationKind | 'All') {
    this.filter = kind;
  }

  dismiss(n: NotificationItem) {
    this.notifications = this.notifications.filter((x) => x.id !== n.id);
    this.cdr.markForCheck();
  }

  markAsRead(n: any) {
    if (!n?.id) return;
    const id = Number(n.id);
    this._emailService.markNotificationRead(id).subscribe({
      next: () => this.getNotifications(),
    });
  }

  markAllAsRead() {
    this._emailService.markAllNotificationsRead().subscribe({
      next: () => this.getNotifications(),
    });
  }

  clearAll() {
    this.notifications = [];
    this.cdr.markForCheck();
  }

  performAction(n: NotificationItem) {
    if (n.actionUrl) {
      window.open(n.actionUrl, '_blank');
    }
  }

  timeAgo(date: Date) {
    const istTime = date.getTime() + 5.5 * 60 * 60 * 1000;
    const diff = Math.floor((Date.now() - istTime) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
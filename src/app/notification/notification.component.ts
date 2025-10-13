import { Component, EventEmitter, Output } from '@angular/core';

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
// import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
// import { BrowserModule } from '@angular/platform-browser';
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
  imports: [
    // BrowserModule,
    CommonModule,
    // BrowserAnimationsModule,
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
    MatChipsModule,
  ],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css',
})
export class NotificationComponent {
  filter: NotificationKind | 'All' = 'All';

  // mock data (replace by real service)
  notifications: NotificationItem[] = [];

  get filteredNotifications(): NotificationItem[] {
    if (this.filter === 'All') return this.notifications;
    return this.notifications.filter((n) => n.category === this.filter);
  }

  constructor(private _emialService: EmailServiceService) {}

  ngOnInit() {
    this.getNotifications();
  }
  getNotifications() {
    this._emialService.getNotification().subscribe({
      next: (res: any[]) => {
        this.notifications = res.map((n) => ({
          id: n.notificationId || n.NotificationId,
          title: 'Inquiries',
          Message: n.message,
          category: 'Inquiries',
          createdAt: new Date(n.createdAt),
          isRead: n.isRead,
          colorTag: n.isRead ? '#9E9E9E' : '#2196F3',
        }));
      },
      error: (err) => console.error('Failed to load notifications', err),
    });
  }

  setFilter(kind: NotificationKind | 'All') {
    this.filter = kind;
  }

  // toggleRead(n: NotificationItem) {
  //   n.isRead = !n.isRead;
  // }

  dismiss(n: NotificationItem) {
    this.notifications = this.notifications.filter((x) => x.id !== n.id);
  }

  markAsRead(n: any) {
    if (!n || !n.id) {
      console.error('Notification ID is missing:', n);
      return;
    }

    const id = Number(n.id);
    this._emialService.markNotificationRead(id).subscribe({
      next: () => {
        console.log(`Notification ${id} marked as read`);
        this.getNotifications(); // refresh list after marking
      },
      error: (err) => console.error('Failed to mark as read', err),
    });
  }

  // toggleRead(n: NotificationItem) {
  //   n.isRead = true;

  //   this._emialService.markNotificationRead(Number(n.id)).subscribe({
  //     next: () => {
  //       console.log(`Marked notification ${n.id} as read`);
  //       n.colorTag = '#9E9E9E';
  //     },
  //     error: (err) =>
  //       console.error('Failed to mark notification as read:', err),
  //   });
  // }

  markAllAsRead() {
    this._emialService.markAllNotificationsRead().subscribe({
      next: (res: any) => {
        console.log(res.message);
        this.getNotifications();
      },
      error: (err) => console.error('Failed to mark all as read', err),
    });
  }

  clearAll() {
    this.notifications = [];
  }

  performAction(n: NotificationItem) {
    if (n.actionUrl) {
      window.open(n.actionUrl, '_blank');
    } else {
      //this.toggleRead(n);
      console.log('Action clicked for', n.id);
    }
  }

  timeAgo(date: Date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
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

import { Injectable } from '@angular/core';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { EmployeeService } from './employee.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  constructor(
    private _employeeService: EmployeeService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  initPush() {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    PushNotifications.addListener('registration', (token: Token) => {
      const userId = this._employeeService.getUserIdFromToken();
      if (!userId) return;

      fetch(
        `${environment.apiUrl}/User/save-token?userId=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this._employeeService.getToken() || ''}`,
          },
          body: JSON.stringify(token.value),
        }
      ).catch(() => {});
    });

    PushNotifications.addListener('registrationError', () => {});

    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        // FIX: was alert() — replaced with toastr for proper mobile UX
        this.toastr.info(notification.body || '', notification.title || 'Notification');
      }
    );

    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (_action: ActionPerformed) => {
        this.router.navigate(['/email-booking']);
      }
    );
  }
}
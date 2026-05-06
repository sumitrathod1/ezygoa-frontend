import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forget',
    loadComponent: () =>
      import('./login/forget-password/forget-password.component').then(
        (m) => m.ForgetPasswordComponent
      ),
    //data: { role: 'Admin' },
    //canActivate: [authGuard],
  },
  {
    path: 'notification',
    loadComponent: () =>
      import('./notification/notification.component').then(
        (m) => m.NotificationComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  // {
  //   path: '',
  //   loadComponent: () =>
  //     import('./home/home.component').then((m) => m.HomeComponent),
  //   canActivate: [authGuard],
  // },
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },

  {
    path: 'vehicle',
    loadComponent: () =>
      import('./vehicle/vehicle.component').then((m) => m.VehicleComponent),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'vehicle-erning',
    loadComponent: () =>
      import('./vehicle/vehicle-earnings/vehicle-earnings.component').then(
        (m) => m.VehicleErningsComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'vehicle-card',
    loadComponent: () =>
      import('./vehicle/vehicle-card/vehicle-card.component').then(
        (m) => m.VehicleCardComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'vehicle-statistics',
    loadComponent: () =>
      import('./vehicle/vehicle-statistics/vehicle-statistics.component').then(
        (m) => m.VehicleStatisticsComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'vehicle-documents',
    loadComponent: () =>
      import('./vehicle/document-table/document-table.component').then(
        (m) => m.DocumentTableComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'expense-table',
    loadComponent: () =>
      import('./vehicle/expense-table/expense-table.component').then(
        (m) => m.ExpenseTableComponent
      ),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'maintenance-table',
    loadComponent: () =>
      import('./vehicle/maintenance-table/maintenance-table.component').then(
        (m) => m.MaintenanceTableComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'booking',
    loadComponent: () =>
      import('./booking/booking.component').then((m) => m.BookingComponent),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'booking-list',
    loadComponent: () =>
      import('./booking/booking-list/booking-list.component').then(
        (m) => m.BookingListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'booking-table',
    loadComponent: () =>
      import('./booking/booking-table/booking-table.component').then(
        (m) => m.BookingTableComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'employee',
    loadComponent: () =>
      import('./employee/employee.component').then((m) => m.EmployeeComponent),
    canActivate: [authGuard],
  },
  {
    path: 'employee-list',
    loadComponent: () =>
      import('./employee/employee-list/employee-list.component').then(
        (m) => m.EmployeeListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'agent',
    loadComponent: () =>
      import('./agents/agents.component').then((m) => m.AgentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./calendar/calendar.component').then((m) => m.CalendarComponent),
    canActivate: [authGuard],
  },
  {
    path: 'agents',
    loadComponent: () =>
      import('./agents/agents.component').then((m) => m.AgentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'agent-details/:id',
    loadComponent: () =>
      import('./agents/agent-details/agent-details.component').then(
        (p) => p.AgentDetailsComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'driver',
    loadComponent: () =>
      import('./driver/driver.component').then((m) => m.DriverComponent),
    canActivate: [authGuard],
    data: { role: ['Driver', 'Employee'] },
    // data: { role: ['Driver'] },
  },
  {
    path: 'earnings',
    loadComponent: () =>
      import('./booking/earnings/earnings.component').then(
        (m) => m.EarningsComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'email-booking',
    loadComponent: () =>
      import('./booking/email-booking/email-booking.component').then(
        (m) => m.EmailBookingComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'driver-bookings',
    loadComponent: () =>
      import('./driver/driver-bookings/driver-bookings.component').then(
        (m) => m.DriverBookingsComponent
      ),
    //canActivate: [authGuard],
    //data: { role: ['Driver', 'Employee'] },
  },
  {
    path: 'vendor-settlements',
    loadComponent: () =>
      import(
        './booking/external-details/vendor-settlements/vendor-settlements.component'
      ).then((m) => m.VendorSettlementsComponent),
    // canActivate: [authGuard],
  },
  {
    path: 'vendor-earnings',
    loadComponent: () =>
      import(
        './booking/external-details/vendor-earnings/vendor-earnings.component'
      ).then((m) => m.VendorEarningsComponent),
    // canActivate: [authGuard],
  },
  {
    path: 'document-vault',
    loadComponent: () =>
      import('./document-vault/document-vault.component').then(
        (m) => m.DocumentVaultComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'business-hub',
    loadComponent: () =>
      import('./business-hub/business-hub.component').then((m) => m.BusinessHubComponent),
    canActivate: [authGuard],
  },
  {
    path: 'business-hub/rate-charts',
    loadComponent: () =>
      import('./business-hub/rate-charts/rate-chart-list.component').then(
        (m) => m.RateChartListComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'business-hub/rate-charts/new',
    loadComponent: () =>
      import('./business-hub/rate-charts/rate-chart-editor/rate-chart-editor.component').then(
        (m) => m.RateChartEditorComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'business-hub/rate-charts/:id',
    loadComponent: () =>
      import('./business-hub/rate-charts/rate-chart-editor/rate-chart-editor.component').then(
        (m) => m.RateChartEditorComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'business-hub/salary',
    loadComponent: () =>
      import('./business-hub/salary/salary.component').then((m) => m.SalaryComponent),
    canActivate: [authGuard],
  },
  {
    path: 'expenses',
    loadComponent: () =>
      import('./expenses/expenses.component').then((m) => m.ExpensesComponent),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: 'bulk-upload',
    loadComponent: () =>
      import('./bulk-upload/bulk-upload.component').then((m) => m.BulkUploadComponent),
    canActivate: [authGuard],
    data: { role: 'Admin' },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];

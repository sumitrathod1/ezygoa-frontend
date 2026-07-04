import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { EmployeeService } from './services/employee.service';
import { CommonModule } from '@angular/common';
import { filter, map, Observable, startWith } from 'rxjs';
import { App } from '@capacitor/app';
import { PushNotificationService } from './services/push-notification.service';
import { BookingService } from './services/booking.service';
import { LoadingService } from './services/loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatMenuModule,
    RouterModule,
    RouterOutlet,
    MatButtonModule,
    CommonModule,
    FooterComponent,
    HeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  title = 'TravelManagement';
  userRole$!: Observable<string | null>;
  isLoginPage$!: Observable<boolean>;
  backButtonListener: any;
  private history: string[] = [];
  private skipNextPush = false;

  private destroyRef = inject(DestroyRef);
  readonly loading$: Observable<boolean>;

  constructor(
    private _employeService: EmployeeService,
    private pushService: PushNotificationService,
    private router: Router,
    private bookingService: BookingService,
    loadingService: LoadingService
  ) {
    this.loading$ = loadingService.loading$;
    this.pushService.initPush();
  }

  ngOnInit(): void {
    this.userRole$ = this._employeService.userRole$;

    if (this._employeService.isloggedIn()) {
      this.bookingService.connectSignalRAfterLogin();
    }

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        if (this.skipNextPush) {
          this.skipNextPush = false;
          return;
        }
        if (
          this.history.length === 0 ||
          this.history[this.history.length - 1] !== event.urlAfterRedirects
        ) {
          this.history.push(event.urlAfterRedirects);
        }
      });

    this.backButtonListener = App.addListener('backButton', () => {
      if (this.history.length > 1) {
        this.history.pop();
        const previousUrl = this.history[this.history.length - 1];
        this.skipNextPush = true;
        this.router.navigateByUrl(previousUrl);
      } else {
        App.exitApp();
      }
    });

    this.isLoginPage$ = this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.url.includes('/login')),
      startWith(this.router.url.includes('/login'))
    );

    this._employeService.userRole$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((role) => {
        const currentUrl = this.router.url;
        if (currentUrl === '/' || currentUrl === '' || currentUrl === '/login') {
          if (role === 'SuperAdmin') {
            this.router.navigate(['/super-admin']);
          } else if (role) {
            this.router.navigate(['/home']);
          } else {
            this.router.navigate(['/login']);
          }
        }
      });
  }

  ngOnDestroy(): void {
    if (this.backButtonListener) {
      this.backButtonListener.remove();
    }
  }
}
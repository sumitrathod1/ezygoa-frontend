import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { HomeComponent } from './home/home.component';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { FooterComponent } from './footer/footer.component';
import { HeaderComponent } from './header/header.component';
import { EmployeeService } from './services/employee.service';
import { CommonModule } from '@angular/common';
import { filter, map, Observable, startWith } from 'rxjs';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatMenuModule,
    RouterOutlet,
    MatButtonModule,
    CommonModule,
    FooterComponent,
    HeaderComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'TravelManagement';
  //userRole: string | null = null;
  userRole$!: Observable<string | null>;
  isLoginPage$!: Observable<boolean>;
  backButtonListener: any;
  private history: string[] = [];
  private skipNextPush = false;

  constructor(
    private _employeService: EmployeeService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.userRole$ = this._employeService.userRole$;

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
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

    this.userRole$.subscribe((role) => {
      if (this.router.url === '/' || this.router.url === '') {
        if (role) {
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

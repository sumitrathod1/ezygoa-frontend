import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  readonly loading$ = this.loadingSubject.asObservable();

  show(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) this.loadingSubject.next(true);
  }

  hide(): void {
    if (this.activeRequests > 0) this.activeRequests--;
    if (this.activeRequests === 0) this.loadingSubject.next(false);
  }
}
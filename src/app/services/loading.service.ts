import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, observeOn } from 'rxjs/operators';
import { asapScheduler } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private activeRequests = 0;
  private loadingSubject = new BehaviorSubject<boolean>(false);
  // Requests start while components are being checked; emitting on the next microtask
  // avoids ExpressionChangedAfterItHasBeenChecked on the global spinner.
  readonly loading$ = this.loadingSubject.pipe(distinctUntilChanged(), observeOn(asapScheduler));

  show(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) this.loadingSubject.next(true);
  }

  hide(): void {
    if (this.activeRequests > 0) this.activeRequests--;
    if (this.activeRequests === 0) this.loadingSubject.next(false);
  }
}
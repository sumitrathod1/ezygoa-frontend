import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  constructor(private router: Router, private toastr: ToastrService) {}

  handle(error: HttpErrorResponse): void {
    const message = this.getErrorMessage(error);

    if (error.status === 401) {
      this.toastr.error('Session expired. Please log in again.', 'Unauthorized');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      this.router.navigate(['/login']);
      return;
    }

    if (error.status === 403) {
      this.toastr.warning('You do not have permission to perform this action.', 'Forbidden');
      return;
    }

    if (error.status === 429) {
      this.toastr.warning('Too many requests. Please wait a moment and try again.', 'Rate Limited');
      return;
    }

    if (error.status === 0) {
      this.toastr.error('Unable to connect to the server. Check your network connection.', 'Connection Error');
      return;
    }

    this.toastr.error(message, 'Error');
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) return error.error.message;
    if (typeof error.error === 'string') return error.error;

    switch (error.status) {
      case 400: return 'Invalid request data.';
      case 404: return 'The requested resource was not found.';
      case 500: return 'A server error occurred. Please try again later.';
      default: return `Unexpected error (${error.status}).`;
    }
  }
}
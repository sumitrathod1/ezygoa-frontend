import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css'],
})
export class NotFoundComponent {
  constructor(private router: Router) {}

  goHome(): void {
    const role = localStorage.getItem('role');
    this.router.navigate([role === 'Admin' ? '/home' : '/driver']);
  }
}
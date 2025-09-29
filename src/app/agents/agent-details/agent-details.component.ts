import { Component } from '@angular/core';
import { AgentService } from '../../services/agent.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-agent-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agent-details.component.html',
  styleUrl: './agent-details.component.css',
})
export class AgentDetailsComponent {
  bookings: any[] = [];
  constructor(
    private route: ActivatedRoute,
    private _agentServices: AgentService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.loadBookingsByAgentID(id);
      }
    });
  }
  loadBookingsByAgentID(id: number) {
    this._agentServices.getBookingByAgentsID(id).subscribe({
      next: (data) => {
        this.bookings = data;
        console.log('Bookings fetched successfully:', data);
      },
      error: (error) => {
        console.error('Error fetching bookings:', error);
      },
    });
  }
}

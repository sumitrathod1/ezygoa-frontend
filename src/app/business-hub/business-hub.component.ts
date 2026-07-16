import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RateChartService } from '../services/rate-chart.service';

interface HubTile {
  icon: string;
  label: string;
  desc: string;
  route: string;
  color: string;
  badge?: string;
}

@Component({
  selector: 'app-business-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-hub.component.html',
  styleUrl: './business-hub.component.css',
})
export class BusinessHubComponent {
  expiredCount = 0;
  expiringSoonCount = 0;

  tiles: HubTile[] = [
    {
      icon: 'bi-file-earmark-bar-graph-fill',
      label: 'Rate Charts',
      desc: 'Create & manage B2B transport rate charts for agents & hotels',
      route: '/business-hub/rate-charts',
      color: 'tile-teal',
    },
    {
      icon: 'bi-people-fill',
      label: 'Agents',
      desc: 'Manage travel agents, hotels and corporate clients',
      route: '/agents',
      color: 'tile-indigo',
    },
    {
      icon: 'bi-graph-up-arrow',
      label: 'Earnings',
      desc: 'Revenue reports and earning analytics',
      route: '/earnings',
      color: 'tile-gold',
    },
    {
      icon: 'bi-calendar2-check-fill',
      label: 'Bookings',
      desc: 'View and manage all bookings in one place',
      route: '/booking-table',
      color: 'tile-navy',
    },
    {
      icon: 'bi-folder2-open',
      label: 'Document Vault',
      desc: 'Vehicle, driver & company documents with expiry tracking',
      route: '/document-vault',
      color: 'tile-teal',
    },
    {
      icon: 'bi-cash-coin',
      label: 'Salary',
      desc: 'Monthly payroll tracking — generate, review & mark paid',
      route: '/business-hub/salary',
      color: 'tile-gold',
    },
    {
      icon: 'bi-geo-alt-fill',
      label: 'Places',
      desc: 'Manage pickup & drop locations with zone and restriction settings',
      route: '/business-hub/places',
      color: 'tile-teal',
    },
    {
      icon: 'bi-currency-rupee',
      label: 'Route Rates',
      desc: 'Set per-vehicle pricing for routes, with peak rates and floor prices',
      route: '/business-hub/route-rates',
      color: 'tile-indigo',
    },
    {
      icon: 'bi-car-front-fill',
      label: 'Rental Rates',
      desc: 'Daily and weekly self-drive rates per vehicle with deposit and km limits',
      route: '/business-hub/rental-rates',
      color: 'tile-navy',
    },
    {
      icon: 'bi-instagram',
      label: 'Image Bank',
      desc: 'Upload and manage photos for Instagram posts and n8n workflows',
      route: '/business-hub/ig-images',
      color: 'tile-gold',
    },
  ];

  constructor(private _router: Router, private _rcService: RateChartService) {}

  ngOnInit() {
    this._rcService.getAll().subscribe((charts) => {
      this.expiredCount = charts.filter((c) => this._rcService.isExpired(c)).length;
      this.expiringSoonCount = charts.filter((c) =>
        this._rcService.isExpiringSoon(c)
      ).length;
      // Attach badge to Rate Charts tile
      const total = this.expiredCount + this.expiringSoonCount;
      if (total > 0) {
        this.tiles[0].badge = `${total} alert${total !== 1 ? 's' : ''}`;
      }
    });
  }

  navigate(route: string) {
    this._router.navigate([route]);
  }
}

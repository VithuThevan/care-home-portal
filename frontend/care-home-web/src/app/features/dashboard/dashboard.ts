import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { getApiErrorMessage } from '../../core/api-error';
import { AuthService } from '../../core/auth.service';

interface DashboardDto {
  totalCareHomes: number;
  currentClients: number;
  availableBeds: number;
  upcomingBillingCount: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  invoicesGenerated: number;
  occupancyByHome: { careHomeId: number; careHomeName: string; capacity: number; occupied: number; available: number }[];
  recentInvoices: { id: number; invoiceNumber: string; careHomeName: string; totalAmount: number; status: string }[];
  billingExceptions: string[];
  upcomingInvoices: { careHomeName: string; fundingAuthorityName: string; billingFrequency: string }[];
  setupHints: string[];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
})
export class DashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  data: DashboardDto | null = null;
  errorMessage = '';

  ngOnInit(): void {
    if (this.auth.isPlatformAdmin() && !this.auth.currentUser()?.tenantPublicId) {
      void this.router.navigate(['/platform/tenants']);
      return;
    }

    this.http.get<DashboardDto>('/api/dashboard').subscribe({
      next: (data) => (this.data = data),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load dashboard.')),
    });
  }
}

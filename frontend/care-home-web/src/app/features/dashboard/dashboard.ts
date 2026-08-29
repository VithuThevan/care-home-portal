import { DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';

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
  readonly dashboard = signal<DashboardDto | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    if (this.auth.isPlatformAdmin() && !this.auth.currentUser()?.tenantPublicId) {
      void this.router.navigate(['/platform/tenants']);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.http
      .get<DashboardDto>('/api/dashboard')
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.dashboard.set(data),
        error: (error) =>
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load dashboard.')),
      });
  }
}

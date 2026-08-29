import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { getApiErrorMessage } from '../../../../core/api-error';

interface TenantRow {
  id: number;
  publicId: string;
  name: string;
  tradingName?: string | null;
  email?: string | null;
  isActive: boolean;
}

@Component({
  selector: 'app-platform-tenant-list',
  imports: [RouterLink],
  templateUrl: './platform-tenant-list.html',
})
export class PlatformTenantListPage implements OnInit {
  private readonly http = inject(HttpClient);
  tenants: TenantRow[] = [];
  errorMessage = '';

  ngOnInit(): void {
    this.http.get<TenantRow[]>('/api/platform/tenants').subscribe({
      next: (tenants) => (this.tenants = tenants),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load organisations.')),
    });
  }
}

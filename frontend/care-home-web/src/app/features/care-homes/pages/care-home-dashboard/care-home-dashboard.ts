import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { CareHomeLocation } from '../../models/care-home.model';
import { CareHomeService } from '../../services/care-home.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { LoadingStateComponent } from '../../../../shared/ui/loading-state';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';

@Component({
  selector: 'app-care-home-dashboard',
  imports: [
    RouterLink,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    ApiErrorComponent,
    LoadingStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './care-home-dashboard.html',
})
export class CareHomeDashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly homes = inject(CareHomeService);
  readonly auth = inject(AuthService);
  readonly data = signal<any | null>(null);
  readonly home = signal<CareHomeLocation | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.data.set(null);
      this.home.set(null);
      this.homes.getCareHome(id).subscribe({
        next: (home) => this.home.set(home),
      });
      this.http
        .get(`/api/dashboard/care-homes/${id}`)
        .pipe(finalize(() => this.isLoading.set(false)))
        .subscribe({
          next: (data) => this.data.set(data),
          error: (error) =>
            this.errorMessage.set(getApiErrorMessage(error, 'Unable to load care home dashboard.')),
        });
    });
  }

  profileLine(): string {
    const home = this.home();
    if (!home) {
      return 'Care home occupancy and recent invoices.';
    }
    return `${home.code} · ${home.companyName}`;
  }
}

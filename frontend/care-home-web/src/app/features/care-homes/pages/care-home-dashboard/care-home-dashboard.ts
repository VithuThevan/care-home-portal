import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-care-home-dashboard',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './care-home-dashboard.html',
})
export class CareHomeDashboardPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly data = signal<any | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.data.set(null);
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
}

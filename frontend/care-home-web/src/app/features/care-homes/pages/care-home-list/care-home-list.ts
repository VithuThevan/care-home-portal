import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CareHomeLocation } from '../../models/care-home.model';
import { CareHomeService } from '../../services/care-home.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-care-home-list',
  imports: [RouterLink],
  templateUrl: './care-home-list.html',
  styleUrl: './care-home-list.scss',
})
export class CareHomeList implements OnInit {
  private readonly careHomeService = inject(CareHomeService);
  readonly auth = inject(AuthService);

  readonly careHomes = signal<CareHomeLocation[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCareHomes();
  }

  loadCareHomes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.careHomeService
      .getCareHomes()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (careHomes) => this.careHomes.set(careHomes),
        error: (error) => {
          console.error(error);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load care homes.'));
        },
      });
  }

  deactivateCareHome(careHome: CareHomeLocation): void {
    const confirmed = window.confirm(`Deactivate ${careHome.name}?`);
    if (!confirmed) {
      return;
    }

    this.careHomeService.deactivateCareHome(careHome.id).subscribe({
      next: () => this.loadCareHomes(),
      error: (error) => {
        console.error(error);
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to deactivate care home.'));
      },
    });
  }
}

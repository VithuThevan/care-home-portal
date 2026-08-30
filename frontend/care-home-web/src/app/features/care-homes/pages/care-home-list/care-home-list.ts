import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

import { CareHomeLocation } from '../../models/care-home.model';
import { CareHomeService } from '../../services/care-home.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { LoadingStateComponent } from '../../../../shared/ui/loading-state';
import { EmptyStateComponent } from '../../../../shared/ui/empty-state';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog.service';
import { ToastService } from '../../../../shared/ui/toast.service';

@Component({
  selector: 'app-care-home-list',
  imports: [
    RouterLink,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './care-home-list.html',
})
export class CareHomeList implements OnInit {
  private readonly careHomeService = inject(CareHomeService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
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
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load care homes.'));
        },
      });
  }

  deactivateCareHome(careHome: CareHomeLocation): void {
    this.confirm
      .confirm({
        title: 'Deactivate care home',
        message: `Deactivate ${careHome.name}? It will no longer be available for new admissions or billing.`,
        confirmLabel: 'Deactivate',
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.careHomeService.deactivateCareHome(careHome.id).subscribe({
          next: () => {
            this.toast.success('Care home deactivated successfully.');
            this.loadCareHomes();
          },
          error: (error) => {
            this.errorMessage.set(getApiErrorMessage(error, 'Unable to deactivate care home.'));
          },
        });
      });
  }
}

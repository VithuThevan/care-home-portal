import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FundingAuthority } from '../../models/funding-authority.model';
import { FundingAuthorityService } from '../../services/funding-authority.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-funding-authority-list',
  imports: [RouterLink],
  templateUrl: './funding-authority-list.html',
  styleUrl: './funding-authority-list.scss'
})
export class FundingAuthorityList implements OnInit {
  private readonly fundingAuthorityService = inject(FundingAuthorityService);
  readonly auth = inject(AuthService);

  readonly fundingAuthorities = signal<FundingAuthority[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadFundingAuthorities();
  }

  loadFundingAuthorities(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fundingAuthorityService
      .getFundingAuthorities()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (fundingAuthorities) => this.fundingAuthorities.set(fundingAuthorities),

        error: (error) => {
          console.error(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to load funding authorities.'
          ));
        }
      });
  }

  deactivateFundingAuthority(authority: FundingAuthority): void {
    const confirmed = window.confirm(`Deactivate ${authority.name}?`);

    if (!confirmed) {
      return;
    }

    this.fundingAuthorityService
      .deactivateFundingAuthority(authority.id)
      .subscribe({
        next: () => {
          this.loadFundingAuthorities();
        },

        error: (error) => {
          console.error(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to deactivate funding authority.'
          ));
        }
      });
  }
}

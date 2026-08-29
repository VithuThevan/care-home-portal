import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FundingAuthority } from '../../models/funding-authority.model';
import { FundingAuthorityService } from '../../services/funding-authority.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-funding-authority-list',
  imports: [RouterLink],
  templateUrl: './funding-authority-list.html',
  styleUrl: './funding-authority-list.scss'
})
export class FundingAuthorityList implements OnInit {
  private readonly fundingAuthorityService = inject(FundingAuthorityService);

  fundingAuthorities: FundingAuthority[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadFundingAuthorities();
  }

  loadFundingAuthorities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.fundingAuthorityService.getFundingAuthorities().subscribe({
      next: (fundingAuthorities) => {
        this.fundingAuthorities = fundingAuthorities;
        this.isLoading = false;
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = getApiErrorMessage(
          error,
          'Unable to load funding authorities.'
        );

        this.isLoading = false;
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

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to deactivate funding authority.'
          );
        }
      });
  }
}

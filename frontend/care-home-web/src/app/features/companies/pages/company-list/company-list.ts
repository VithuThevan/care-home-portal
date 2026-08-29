import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Company } from '../../models/company.model';
import { CompanyService } from '../../services/company.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-company-list',
  imports: [RouterLink],
  templateUrl: './company-list.html',
  styleUrl: './company-list.scss',
})
export class CompanyList implements OnInit {
  private readonly companyService = inject(CompanyService);
  readonly auth = inject(AuthService);

  readonly companies = signal<Company[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.companyService
      .getCompanies()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (companies) => this.companies.set(companies),
        error: (error) => {
          console.error(error);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load companies.'));
        },
      });
  }

  deactivateCompany(company: Company): void {
    const confirmed = window.confirm(`Are you sure you want to deactivate ${company.name}?`);
    if (!confirmed) {
      return;
    }

    this.companyService.deactivateCompany(company.id).subscribe({
      next: () => this.loadCompanies(),
      error: (error) => {
        console.error(error);
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to deactivate company.'));
      },
    });
  }
}

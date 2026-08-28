import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Company } from '../../models/company.model';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-company-list',
  imports: [
    RouterLink
  ],
  templateUrl: './company-list.html',
  styleUrl: './company-list.scss'
})
export class CompanyList implements OnInit {
  private readonly companyService = inject(CompanyService);

  companies: Company[] = [];

  isLoading = false;

  errorMessage = '';

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.companyService.getCompanies().subscribe({
      next: (companies) => {
        this.companies = companies;
        this.isLoading = false;
      },

      error: (error) => {
        console.error(error);

        this.errorMessage =
          'Unable to load companies.';

        this.isLoading = false;
      }
    });
  }

  deactivateCompany(company: Company): void {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${company.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.companyService
      .deactivateCompany(company.id)
      .subscribe({
        next: () => {
          this.loadCompanies();
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            error.error?.message ??
            'Unable to deactivate company.';
        }
      });
  }
}
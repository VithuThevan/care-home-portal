import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { InvoiceCategory } from '../../models/invoice-category.model';
import { InvoiceCategoryService } from '../../services/invoice-category.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-invoice-category-list',
  imports: [RouterLink],
  templateUrl: './invoice-category-list.html',
  styleUrl: './invoice-category-list.scss'
})
export class InvoiceCategoryList implements OnInit {
  private readonly invoiceCategoryService = inject(InvoiceCategoryService);

  invoiceCategories: InvoiceCategory[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadInvoiceCategories();
  }

  loadInvoiceCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.invoiceCategoryService.getInvoiceCategories().subscribe({
      next: (invoiceCategories) => {
        this.invoiceCategories = invoiceCategories;
        this.isLoading = false;
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = getApiErrorMessage(
          error,
          'Unable to load invoice categories.'
        );

        this.isLoading = false;
      }
    });
  }

  deactivateInvoiceCategory(category: InvoiceCategory): void {
    const confirmed = window.confirm(`Deactivate ${category.name}?`);

    if (!confirmed) {
      return;
    }

    this.invoiceCategoryService
      .deactivateInvoiceCategory(category.id)
      .subscribe({
        next: () => {
          this.loadInvoiceCategories();
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to deactivate invoice category.'
          );
        }
      });
  }
}

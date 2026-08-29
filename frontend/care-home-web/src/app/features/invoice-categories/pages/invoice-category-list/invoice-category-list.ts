import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { InvoiceCategory } from '../../models/invoice-category.model';
import { InvoiceCategoryService } from '../../services/invoice-category.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-invoice-category-list',
  imports: [RouterLink],
  templateUrl: './invoice-category-list.html',
  styleUrl: './invoice-category-list.scss'
})
export class InvoiceCategoryList implements OnInit {
  private readonly invoiceCategoryService = inject(InvoiceCategoryService);
  readonly auth = inject(AuthService);

  readonly invoiceCategories = signal<InvoiceCategory[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInvoiceCategories();
  }

  loadInvoiceCategories(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.invoiceCategoryService
      .getInvoiceCategories()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (invoiceCategories) => this.invoiceCategories.set(invoiceCategories),

        error: (error) => {
          console.error(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to load invoice categories.'
          ));
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

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to deactivate invoice category.'
          ));
        }
      });
  }
}

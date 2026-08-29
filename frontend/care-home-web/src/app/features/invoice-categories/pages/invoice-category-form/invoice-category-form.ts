import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { InvoiceCategoryService } from '../../services/invoice-category.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-invoice-category-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './invoice-category-form.html',
  styleUrl: './invoice-category-form.scss'
})
export class InvoiceCategoryForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly invoiceCategoryService = inject(InvoiceCategoryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  invoiceCategoryId: number | null = null;

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(500)],
    isActive: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.invoiceCategoryId = Number(id);
      this.isEditMode = true;
      this.loadInvoiceCategory();
    }
  }

  private loadInvoiceCategory(): void {
    if (this.invoiceCategoryId === null) {
      return;
    }

    this.isLoading = true;

    this.invoiceCategoryService
      .getInvoiceCategory(this.invoiceCategoryId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (category) => {
          this.form.patchValue({
            code: category.code,
            name: category.name,
            description: category.description ?? '',
            isActive: category.isActive
          });
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to load invoice category.'
          );
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSaving = true;

    const value = this.form.getRawValue();

    const request = {
      code: value.code,
      name: value.name,
      description: value.description
    };

    if (this.isEditMode && this.invoiceCategoryId !== null) {
      this.invoiceCategoryService
        .updateInvoiceCategory(this.invoiceCategoryId, {
          ...request,
          isActive: value.isActive
        })
        .pipe(
          finalize(() => {
            this.isSaving = false;
          })
        )
        .subscribe({
          next: () => {
            this.router.navigate(['/invoice-categories']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage = getApiErrorMessage(
              error,
              'Unable to update invoice category.'
            );
          }
        });

      return;
    }

    this.invoiceCategoryService
      .createInvoiceCategory(request)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/invoice-categories']);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to create invoice category.'
          );
        }
      });
  }
}

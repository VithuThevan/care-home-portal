import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { CompanyService } from '../../services/company.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-company-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './company-form.html',
  styleUrl: './company-form.scss'
})
export class CompanyForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly companyService = inject(CompanyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  companyId: number | null = null;
  isEditMode = false;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    isActive: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.companyId = Number(id);
      this.isEditMode = true;
      this.loadCompany();
    }
  }

  private loadCompany(): void {
    if (this.companyId === null) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.companyService
      .getCompany(this.companyId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (company) => {
          this.form.patchValue({
            name: company.name,
            isActive: company.isActive
          });
        },
        error: (error) => {
          console.error(error);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load company.'));
        }
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSaving.set(true);
    const formValue = this.form.getRawValue();

    if (this.isEditMode && this.companyId !== null) {
      this.companyService
        .updateCompany(this.companyId, {
          name: formValue.name,
          isActive: formValue.isActive
        })
        .pipe(finalize(() => this.isSaving.set(false)))
        .subscribe({
          next: () => this.router.navigate(['/companies']),
          error: (error) => {
            console.error(error);
            this.errorMessage.set(getApiErrorMessage(error, 'Unable to update company.'));
          }
        });
      return;
    }

    this.companyService
      .createCompany({ name: formValue.name })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/companies']),
        error: (error) => {
          console.error(error);
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to create company.'));
        }
      });
  }
}

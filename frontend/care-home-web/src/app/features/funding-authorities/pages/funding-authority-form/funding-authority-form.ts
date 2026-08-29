import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FundingAuthorityService } from '../../services/funding-authority.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-funding-authority-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './funding-authority-form.html',
  styleUrl: './funding-authority-form.scss'
})
export class FundingAuthorityForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly fundingAuthorityService = inject(FundingAuthorityService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  fundingAuthorityId: number | null = null;

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    type: ['', Validators.required],
    contactName: ['', Validators.maxLength(150)],
    phone: ['', Validators.maxLength(30)],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    address: ['', Validators.maxLength(300)],
    billingFrequency: ['', Validators.required],
    billingIntervalDays: this.formBuilder.control<number | null>(null),
    isActive: [true]
  });

  get isCustomDays(): boolean {
    return this.form.controls.billingFrequency.value === 'CustomDays';
  }

  ngOnInit(): void {
    this.form.controls.billingFrequency.valueChanges.subscribe((frequency) => {
      this.updateBillingIntervalValidators(frequency);
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.fundingAuthorityId = Number(id);
      this.isEditMode = true;
      this.loadFundingAuthority();
    }
  }

  private updateBillingIntervalValidators(frequency: string): void {
    const control = this.form.controls.billingIntervalDays;

    if (frequency === 'CustomDays') {
      control.setValidators([Validators.required, Validators.min(1)]);
    } else {
      control.clearValidators();
      control.setValue(null, { emitEvent: false });
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  private loadFundingAuthority(): void {
    if (this.fundingAuthorityId === null) {
      return;
    }

    this.isLoading = true;

    this.fundingAuthorityService
      .getFundingAuthority(this.fundingAuthorityId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (authority) => {
          this.form.patchValue(
            {
              code: authority.code,
              name: authority.name,
              type: authority.type,
              contactName: authority.contactName ?? '',
              phone: authority.phone ?? '',
              email: authority.email ?? '',
              address: authority.address ?? '',
              billingFrequency: authority.billingFrequency,
              billingIntervalDays: authority.billingIntervalDays,
              isActive: authority.isActive
            },
            { emitEvent: false }
          );

          this.updateBillingIntervalValidators(authority.billingFrequency);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to load funding authority.'
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
      type: value.type,
      contactName: value.contactName,
      phone: value.phone,
      email: value.email,
      address: value.address,
      billingFrequency: value.billingFrequency,
      billingIntervalDays:
        value.billingFrequency === 'CustomDays'
          ? value.billingIntervalDays
          : null
    };

    if (this.isEditMode && this.fundingAuthorityId !== null) {
      this.fundingAuthorityService
        .updateFundingAuthority(this.fundingAuthorityId, {
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
            this.router.navigate(['/funding-authorities']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage = getApiErrorMessage(
              error,
              'Unable to update funding authority.'
            );
          }
        });

      return;
    }

    this.fundingAuthorityService
      .createFundingAuthority(request)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/funding-authorities']);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to create funding authority.'
          );
        }
      });
  }
}

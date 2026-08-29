import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-organisation-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './organisation-settings.html',
})
export class OrganisationSettingsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  errorMessage = '';
  savedMessage = '';
  isSaving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    tradingName: [''],
    registrationNumber: [''],
    address: [''],
    phone: [''],
    email: [''],
    website: [''],
    currencyCode: ['GBP', Validators.required],
    currencySymbol: ['£', Validators.required],
    timeZoneId: ['Europe/London', Validators.required],
    invoicePrefix: ['INV-'],
    creditNotePrefix: ['CN-'],
    numberLength: [4, Validators.required],
    paymentTermsDays: [30, Validators.required],
    emailFromName: [''],
    emailFromAddress: [''],
    primaryColour: [''],
  });

  ngOnInit(): void {
    this.http.get<typeof this.form.value>('/api/settings/organisation').subscribe({
      next: (settings) => this.form.patchValue(settings),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load organisation settings.')),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.savedMessage = '';
    this.http.put('/api/settings/organisation', this.form.getRawValue()).subscribe({
      next: () => {
        this.isSaving = false;
        this.savedMessage = 'Organisation settings saved.';
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = getApiErrorMessage(error, 'Unable to save organisation settings.');
      },
    });
  }
}

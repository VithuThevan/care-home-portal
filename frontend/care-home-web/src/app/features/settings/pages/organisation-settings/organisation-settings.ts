import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-organisation-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './organisation-settings.html',
})
export class OrganisationSettingsPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly errorMessage = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);

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
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.http
      .get<typeof this.form.value>('/api/settings/organisation')
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (settings) => this.form.patchValue(settings),
        error: (error) =>
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load organisation settings.')),
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.savedMessage.set(null);
    this.http
      .put('/api/settings/organisation', this.form.getRawValue())
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.savedMessage.set('Organisation settings saved.');
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to save organisation settings.'));
        },
      });
  }
}

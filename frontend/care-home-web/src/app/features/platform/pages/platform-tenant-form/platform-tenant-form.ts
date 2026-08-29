import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-platform-tenant-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './platform-tenant-form.html',
})
export class PlatformTenantFormPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  tenantId: number | null = null;
  isEditMode = false;
  errorMessage = '';
  isSaving = false;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    tradingName: [''],
    registrationNumber: [''],
    address: [''],
    phone: [''],
    email: [''],
    website: [''],
    isActive: [true],
    adminEmail: [''],
    adminPassword: [''],
    adminDisplayName: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.tenantId = Number(id);
      this.isEditMode = true;
      this.http.get<typeof this.form.value>(`/api/platform/tenants/${id}`).subscribe({
        next: (tenant) => this.form.patchValue(tenant),
        error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load organisation.')),
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const body = this.form.getRawValue();
    const request$ = this.isEditMode
      ? this.http.put(`/api/platform/tenants/${this.tenantId}`, body)
      : this.http.post('/api/platform/tenants', body);

    request$.subscribe({
      next: () => void this.router.navigate(['/platform/tenants']),
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = getApiErrorMessage(error, 'Unable to save organisation.');
      },
    });
  }
}

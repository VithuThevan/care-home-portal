import { Component, inject, OnInit } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import { CareHomeLocation } from '../../../care-homes/models/care-home.model';

import { CareHomeService } from '../../../care-homes/services/care-home.service';

import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-form',

  imports: [ReactiveFormsModule, RouterLink],

  templateUrl: './client-form.html',

  styleUrl: './client-form.scss',
})
export class ClientForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly clientService = inject(ClientService);

  private readonly careHomeService = inject(CareHomeService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  clientId: number | null = null;

  careHomes: CareHomeLocation[] = [];

  assignedCareHomeId: number | null = null;

  isEditMode = false;

  isLoading = false;

  isSaving = false;

  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    careHomeId: [0, [Validators.required, Validators.min(1)]],

    sageId: ['', [Validators.required, Validators.maxLength(20)]],

    referenceNumber: ['', [Validators.required, Validators.maxLength(20)]],

    title: [''],

    firstName: ['', Validators.required],

    lastName: ['', Validators.required],

    dateOfBirth: [''],

    careType: ['', Validators.required],

    status: ['Current'],

    admissionDate: ['', Validators.required],

    dischargeDate: [''],

    dischargeReason: [''],

    email: ['', Validators.email],

    phone: [''],

    notes: [''],

    isArchived: [false],
  });

  get selectableCareHomes(): CareHomeLocation[] {
    return this.careHomes.filter(
      (careHome) =>
        careHome.isActive ||
        (this.isEditMode && careHome.id === this.assignedCareHomeId),
    );
  }

  get isCurrentStatus(): boolean {
    return this.form.controls.status.value === 'Current';
  }

  ngOnInit(): void {
    this.loadCareHomes();

    this.form.controls.status.valueChanges.subscribe((status) => {
      if (status === 'Current') {
        this.form.patchValue(
          {
            dischargeDate: '',
            dischargeReason: '',
            isArchived: false,
          },
          { emitEvent: false },
        );

        this.form.controls.dischargeDate.clearValidators();
      } else {
        this.form.controls.dischargeDate.setValidators(Validators.required);
      }

      this.form.controls.dischargeDate.updateValueAndValidity({
        emitEvent: false,
      });
    });

    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.clientId = Number(id);

      this.isEditMode = true;

      this.loadClient();
    }
  }

  private loadCareHomes(): void {
    this.careHomeService.getCareHomes().subscribe({
      next: (careHomes) => {
        this.careHomes = careHomes;
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = 'Unable to load care homes.';
      },
    });
  }

  private loadClient(): void {
    if (this.clientId === null) {
      return;
    }

    this.isLoading = true;

    this.clientService
      .getClient(this.clientId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (client) => {
          this.assignedCareHomeId = client.careHomeId;

          this.form.patchValue({
            careHomeId: client.careHomeId,

            sageId: client.sageId,

            referenceNumber: client.referenceNumber,

            title: client.title ?? '',

            firstName: client.firstName,

            lastName: client.lastName,

            dateOfBirth: client.dateOfBirth ?? '',

            careType: client.careType,

            status: client.status,

            admissionDate: client.admissionDate,

            dischargeDate: client.dischargeDate ?? '',

            dischargeReason: client.dischargeReason ?? '',

            email: client.email ?? '',

            phone: client.phone ?? '',

            notes: client.notes ?? '',

            isArchived: client.isArchived,
          });
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = 'Unable to load client.';
        },
      });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.errorMessage = '';

    const value = this.form.getRawValue();

    if (this.isEditMode && value.status !== 'Current' && !value.dischargeDate) {
      this.form.markAllAsTouched();

      this.errorMessage =
        'Discharge date is required when client is no longer current.';

      return;
    }

    this.isSaving = true;

    const baseRequest = {
      careHomeId: value.careHomeId,

      sageId: value.sageId,

      referenceNumber: value.referenceNumber,

      title: value.title,

      firstName: value.firstName,

      lastName: value.lastName,

      dateOfBirth: value.dateOfBirth || null,

      careType: value.careType,

      admissionDate: value.admissionDate,

      email: value.email,

      phone: value.phone,

      notes: value.notes,
    };

    if (this.isEditMode && this.clientId !== null) {
        this.clientService
        .updateClient(this.clientId, {
          ...baseRequest,

          status: value.status,

          dischargeDate:
            value.status === 'Current' ? null : value.dischargeDate || null,

          dischargeReason:
            value.status === 'Current' ? null : value.dischargeReason,

          isArchived: value.status === 'Current' ? false : value.isArchived,
        })
        .subscribe({
          next: () => {
            this.router.navigate(['/clients']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage = error.error?.message ?? 'Unable to update client.';

            this.isSaving = false;
          },
        });

      return;
    }

    this.clientService.createClient(baseRequest).subscribe({
      next: () => {
        this.router.navigate(['/clients']);
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = error.error?.message ?? 'Unable to create client.';

        this.isSaving = false;
      },
    });
  }
}

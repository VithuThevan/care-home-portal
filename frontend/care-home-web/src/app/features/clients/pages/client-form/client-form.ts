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

  ngOnInit(): void {
    this.loadCareHomes();

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
        this.careHomes = careHomes.filter((x) => x.isActive);
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
          this.form.patchValue({
            careHomeId: client.careHomeId,

            sageId: client.sageId,

            referenceNumber: client.referenceNumber,

            title: client.title ?? '',

            firstName: client.firstName,

            lastName: client.lastName,

            dateOfBirth: client.dateOfBirth?.substring(0, 10) ?? '',

            careType: client.careType,

            status: client.status,

            admissionDate: client.admissionDate.substring(0, 10),

            dischargeDate: client.dischargeDate?.substring(0, 10) ?? '',

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

    this.isSaving = true;

    this.errorMessage = '';

    const value = this.form.getRawValue();

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

          dischargeDate: value.dischargeDate || null,

          dischargeReason: value.dischargeReason,

          isArchived: value.isArchived,
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

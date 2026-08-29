import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { NominalCodeService } from '../../services/nominal-code.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-nominal-code-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './nominal-code-form.html',
  styleUrl: './nominal-code-form.scss'
})
export class NominalCodeForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly nominalCodeService = inject(NominalCodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  nominalCodeId: number | null = null;

  isEditMode = false;
  isLoading = false;
  isSaving = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
    isActive: [true]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.nominalCodeId = Number(id);
      this.isEditMode = true;
      this.loadNominalCode();
    }
  }

  private loadNominalCode(): void {
    if (this.nominalCodeId === null) {
      return;
    }

    this.isLoading = true;

    this.nominalCodeService
      .getNominalCode(this.nominalCodeId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (nominalCode) => {
          this.form.patchValue({
            code: nominalCode.code,
            name: nominalCode.name,
            description: nominalCode.description ?? '',
            isActive: nominalCode.isActive
          });
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to load nominal code.'
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

    if (this.isEditMode && this.nominalCodeId !== null) {
      this.nominalCodeService
        .updateNominalCode(this.nominalCodeId, {
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
            this.router.navigate(['/nominal-codes']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage = getApiErrorMessage(
              error,
              'Unable to update nominal code.'
            );
          }
        });

      return;
    }

    this.nominalCodeService
      .createNominalCode(request)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/nominal-codes']);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage = getApiErrorMessage(
            error,
            'Unable to create nominal code.'
          );
        }
      });
  }
}

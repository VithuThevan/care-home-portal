import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { NominalCodeService } from '../../services/nominal-code.service';
import { getApiErrorMessage, logApiFailure } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { LoadingStateComponent } from '../../../../shared/ui/loading-state';

@Component({
  selector: 'app-nominal-code-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
    LoadingStateComponent,
  ],
  templateUrl: './nominal-code-form.html',
})
export class NominalCodeForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly nominalCodeService = inject(NominalCodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  nominalCodeId: number | null = null;

  isEditMode = false;
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);

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

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.nominalCodeService
      .getNominalCode(this.nominalCodeId)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
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
          logApiFailure(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to load nominal code.'
          ));
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
            this.isSaving.set(false);
          })
        )
        .subscribe({
          next: () => {
            this.router.navigate(['/nominal-codes']);
          },

          error: (error) => {
            logApiFailure(error);

            this.errorMessage.set(getApiErrorMessage(
              error,
              'Unable to update nominal code.'
            ));
          }
        });

      return;
    }

    this.nominalCodeService
      .createNominalCode(request)
      .pipe(
        finalize(() => {
          this.isSaving.set(false);
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/nominal-codes']);
        },

        error: (error) => {
          logApiFailure(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to create nominal code.'
          ));
        }
      });
  }
}

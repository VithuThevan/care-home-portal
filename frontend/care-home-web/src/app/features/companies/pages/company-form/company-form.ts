import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import { finalize } from 'rxjs';

import { CompanyService } from '../../services/company.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-company-form',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './company-form.html',
  styleUrl: './company-form.scss'
})
export class CompanyForm implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  private readonly companyService =
    inject(CompanyService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  companyId: number | null = null;

  isEditMode = false;

  isLoading = false;

  isSaving = false;

  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.maxLength(150)
      ]
    ],

    isActive: [true]
  });

  ngOnInit(): void {
    const id =
      this.route.snapshot.paramMap.get('id');

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

    this.isLoading = true;

    this.companyService
      .getCompany(this.companyId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (company) => {
          this.form.patchValue({
            name: company.name,
            isActive: company.isActive
          });
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            getApiErrorMessage(error, 'Unable to load company.');
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

    const formValue =
      this.form.getRawValue();

    if (this.isEditMode && this.companyId !== null) {
      this.companyService
        .updateCompany(
          this.companyId,
          {
            name: formValue.name,
            isActive: formValue.isActive
          }
        )
        .pipe(
          finalize(() => {
            this.isSaving = false;
          })
        )
        .subscribe({
          next: () => {
            this.router.navigate(['/companies']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage =
              getApiErrorMessage(error, 'Unable to update company.');
          }
        });

      return;
    }

    this.companyService
      .createCompany({
        name: formValue.name
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/companies']);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            getApiErrorMessage(error, 'Unable to create company.');
        }
      });
  }
}
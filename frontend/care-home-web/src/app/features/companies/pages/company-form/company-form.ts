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

import { CompanyService } from '../../services/company.service';

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
      .subscribe({
        next: (company) => {
          this.form.patchValue({
            name: company.name,
            isActive: company.isActive
          });

          this.isLoading = false;
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            'Unable to load company.';

          this.isLoading = false;
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
        .subscribe({
          next: () => {
            this.router.navigate(['/companies']);
          },

          error: (error) => {
            console.error(error);

            this.errorMessage =
              error.error?.message ??
              'Unable to update company.';

            this.isSaving = false;
          }
        });

      return;
    }

    this.companyService
      .createCompany({
        name: formValue.name
      })
      .subscribe({
        next: () => {
          this.router.navigate(['/companies']);
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            error.error?.message ??
            'Unable to create company.';

          this.isSaving = false;
        }
      });
  }
}
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

import {
  Company
} from '../../../companies/models/company.model';

import {
  CompanyService
} from '../../../companies/services/company.service';

import {
  CareHomeService
} from '../../services/care-home.service';


@Component({
  selector: 'app-care-home-form',

  imports: [
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './care-home-form.html',
  styleUrl: './care-home-form.scss'
})
export class CareHomeForm implements OnInit {

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly careHomeService =
    inject(CareHomeService);

  private readonly companyService =
    inject(CompanyService);

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);


  careHomeId: number | null = null;

  companies: Company[] = [];

  assignedCompanyId: number | null = null;

  isEditMode = false;

  isLoading = false;

  isSaving = false;

  errorMessage = '';


  readonly form =
    this.formBuilder.nonNullable.group({

      companyId: [
        0,
        [
          Validators.required,
          Validators.min(1)
        ]
      ],

      code: [
        '',
        [
          Validators.required,
          Validators.maxLength(30)
        ]
      ],

      name: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      bedCapacity: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      address: [''],

      phone: [''],

      email: [
        '',
        Validators.email
      ],

      managerName: [''],

      managerPhone: [''],

      managerEmail: [
        '',
        Validators.email
      ],

      isActive: [true]

    });

  get selectableCompanies(): Company[] {
    return this.companies.filter(
      (company) =>
        company.isActive ||
        (this.isEditMode && company.id === this.assignedCompanyId)
    );
  }

  ngOnInit(): void {

    this.loadCompanies();

    const id =
      this.route.snapshot.paramMap.get('id');

    if (id) {

      this.careHomeId = Number(id);

      this.isEditMode = true;

      this.loadCareHome();
    }

  }


  private loadCompanies(): void {

    this.companyService
      .getCompanies()
      .subscribe({

        next: (companies) => {

          this.companies = companies;

        },

        error: (error) => {

          console.error(error);

          this.errorMessage =
            'Unable to load companies.';
        }

      });
  }


  private loadCareHome(): void {

    if (this.careHomeId === null) {
      return;
    }

    this.isLoading = true;


    this.careHomeService
      .getCareHome(this.careHomeId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({

        next: (careHome) => {

          this.assignedCompanyId =
            careHome.companyId;

          this.form.patchValue({

            companyId:
              careHome.companyId,

            code:
              careHome.code,

            name:
              careHome.name,

            bedCapacity:
              careHome.bedCapacity,

            address:
              careHome.address ?? '',

            phone:
              careHome.phone ?? '',

            email:
              careHome.email ?? '',

            managerName:
              careHome.managerName ?? '',

            managerPhone:
              careHome.managerPhone ?? '',

            managerEmail:
              careHome.managerEmail ?? '',

            isActive:
              careHome.isActive

          });

        },

        error: (error) => {

          console.error(error);

          this.errorMessage =
            'Unable to load care home.';
        }

      });

  }


  save(): void {

    if (this.form.invalid) {

      this.form.markAllAsTouched();

      return;
    }


    this.isSaving = true;

    this.errorMessage = '';


    const value =
      this.form.getRawValue();


    const request = {

      companyId:
        value.companyId,

      code:
        value.code,

      name:
        value.name,

      bedCapacity:
        value.bedCapacity,

      address:
        value.address,

      phone:
        value.phone,

      email:
        value.email,

      managerName:
        value.managerName,

      managerPhone:
        value.managerPhone,

      managerEmail:
        value.managerEmail

    };


    if (
      this.isEditMode &&
      this.careHomeId !== null
    ) {

      this.careHomeService
        .updateCareHome(
          this.careHomeId,
          {
            ...request,
            isActive:
              value.isActive
          }
        )
        .subscribe({

          next: () => {

            this.router.navigate([
              '/care-homes'
            ]);

          },

          error: (error) => {

            console.error(error);

            this.errorMessage =
              error.error?.message ??
              'Unable to update care home.';

            this.isSaving = false;

          }

        });

      return;
    }


    this.careHomeService
      .createCareHome(request)
      .subscribe({

        next: () => {

          this.router.navigate([
            '/care-homes'
          ]);

        },

        error: (error) => {

          console.error(error);

          this.errorMessage =
            error.error?.message ??
            'Unable to create care home.';

          this.isSaving = false;

        }

      });

  }

}
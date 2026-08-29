import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import { RouterLink } from '@angular/router';

import {
  CareHomeLocation
} from '../../models/care-home.model';

import {
  CareHomeService
} from '../../services/care-home.service';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-care-home-list',
  imports: [
    RouterLink
  ],
  templateUrl: './care-home-list.html',
  styleUrl: './care-home-list.scss'
})
export class CareHomeList implements OnInit {

  private readonly careHomeService =
    inject(CareHomeService);

  careHomes: CareHomeLocation[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadCareHomes();
  }

  loadCareHomes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.careHomeService
      .getCareHomes()
      .subscribe({
        next: (careHomes) => {
          this.careHomes = careHomes;
          this.isLoading = false;
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            getApiErrorMessage(error, 'Unable to load care homes.');

          this.isLoading = false;
        }
      });
  }

  deactivateCareHome(
    careHome: CareHomeLocation
  ): void {

    const confirmed = window.confirm(
      `Deactivate ${careHome.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.careHomeService
      .deactivateCareHome(careHome.id)
      .subscribe({
        next: () => {
          this.loadCareHomes();
        },

        error: (error) => {
          console.error(error);

          this.errorMessage =
            getApiErrorMessage(
              error,
              'Unable to deactivate care home.'
            );
        }
      });
  }
}
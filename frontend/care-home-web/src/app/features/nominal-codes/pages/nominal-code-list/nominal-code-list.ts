import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NominalCode } from '../../models/nominal-code.model';
import { NominalCodeService } from '../../services/nominal-code.service';
import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-nominal-code-list',
  imports: [RouterLink],
  templateUrl: './nominal-code-list.html',
  styleUrl: './nominal-code-list.scss'
})
export class NominalCodeList implements OnInit {
  private readonly nominalCodeService = inject(NominalCodeService);

  nominalCodes: NominalCode[] = [];

  isLoading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadNominalCodes();
  }

  loadNominalCodes(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.nominalCodeService.getNominalCodes().subscribe({
      next: (nominalCodes) => {
        this.nominalCodes = nominalCodes;
        this.isLoading = false;
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = getApiErrorMessage(
          error,
          'Unable to load nominal codes.'
        );

        this.isLoading = false;
      }
    });
  }

  deactivateNominalCode(nominalCode: NominalCode): void {
    const confirmed = window.confirm(`Deactivate ${nominalCode.name}?`);

    if (!confirmed) {
      return;
    }

    this.nominalCodeService.deactivateNominalCode(nominalCode.id).subscribe({
      next: () => {
        this.loadNominalCodes();
      },

      error: (error) => {
        console.error(error);

        this.errorMessage = getApiErrorMessage(
          error,
          'Unable to deactivate nominal code.'
        );
      }
    });
  }
}

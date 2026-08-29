import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { NominalCode } from '../../models/nominal-code.model';
import { NominalCodeService } from '../../services/nominal-code.service';
import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-nominal-code-list',
  imports: [RouterLink],
  templateUrl: './nominal-code-list.html',
  styleUrl: './nominal-code-list.scss'
})
export class NominalCodeList implements OnInit {
  private readonly nominalCodeService = inject(NominalCodeService);
  readonly auth = inject(AuthService);

  readonly nominalCodes = signal<NominalCode[]>([]);

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadNominalCodes();
  }

  loadNominalCodes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.nominalCodeService
      .getNominalCodes()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (nominalCodes) => this.nominalCodes.set(nominalCodes),

        error: (error) => {
          console.error(error);

          this.errorMessage.set(getApiErrorMessage(
            error,
            'Unable to load nominal codes.'
          ));
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

        this.errorMessage.set(getApiErrorMessage(
          error,
          'Unable to deactivate nominal code.'
        ));
      }
    });
  }
}

import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-misc-charges',
  templateUrl: './misc-charges.html',
})
export class MiscChargesPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  readonly preview = signal<any | null>(null);
  readonly batches = signal<any[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly info = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<PagedResult<any>>('/api/misc-charges/imports').subscribe({
      next: (x) => this.batches.set(x.items),
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to load import batches.')),
    });
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.errorMessage.set(null);
    const data = new FormData();
    data.append('file', file);
    this.http.post('/api/misc-charges/import/preview', data).subscribe({
      next: (preview) => this.preview.set(preview),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Preview failed.')),
    });
  }

  confirm(): void {
    this.errorMessage.set(null);
    this.http.post('/api/misc-charges/import/confirm', this.preview()).subscribe({
      next: () => {
        this.info.set('Import committed.');
        this.ngOnInit();
      },
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Import failed.')),
    });
  }
}

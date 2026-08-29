import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';

import { getApiErrorMessage } from '../../../../core/api-error';
import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-misc-charges',
  templateUrl: './misc-charges.html',
})
export class MiscChargesPage implements OnInit {
  private readonly http = inject(HttpClient);
  preview: any = null;
  batches: any[] = [];
  errorMessage = '';
  info = '';

  ngOnInit(): void {
    this.http.get<PagedResult<any>>('/api/misc-charges/imports').subscribe((x) => (this.batches = x.items));
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    this.http.post('/api/misc-charges/import/preview', data).subscribe({
      next: (preview) => (this.preview = preview),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Preview failed.')),
    });
  }

  confirm(): void {
    this.http.post('/api/misc-charges/import/confirm', this.preview).subscribe({
      next: () => {
        this.info = 'Import committed.';
        this.ngOnInit();
      },
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Import failed.')),
    });
  }
}

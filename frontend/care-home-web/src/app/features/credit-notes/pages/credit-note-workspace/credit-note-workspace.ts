import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-credit-note-workspace',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './credit-note-workspace.html',
})
export class CreditNoteWorkspacePage {
  private readonly http = inject(HttpClient);
  clientId = '';
  periodStart = '';
  periodEnd = '';
  reason = '';
  preview: any = null;
  notes: any[] = [];
  errorMessage = '';

  constructor() {
    this.http.get<any[]>('/api/credit-notes').subscribe((x) => (this.notes = x));
  }

  runPreview(): void {
    this.http.post('/api/credit-notes/preview', {
      clientId: this.clientId ? Number(this.clientId) : null,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      reason: this.reason,
      creditNoteDate: this.periodEnd,
    }).subscribe({
      next: (preview) => (this.preview = preview),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Preview failed.')),
    });
  }

  generate(): void {
    this.http.post('/api/credit-notes/generate', {
      clientId: this.clientId ? Number(this.clientId) : null,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      reason: this.reason,
      creditNoteDate: this.periodEnd,
    }).subscribe({
      next: () => this.http.get<any[]>('/api/credit-notes').subscribe((x) => (this.notes = x)),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Generate failed.')),
    });
  }

  pdf(id: number): void {
    this.http.get(`/api/credit-notes/${id}/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      window.open(URL.createObjectURL(blob), '_blank');
    });
  }
}

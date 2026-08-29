import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-credit-note-workspace',
  imports: [FormsModule, DecimalPipe],
  templateUrl: './credit-note-workspace.html',
})
export class CreditNoteWorkspacePage {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  clientId = '';
  periodStart = '';
  periodEnd = '';
  reason = '';
  readonly preview = signal<any | null>(null);
  readonly notes = signal<any[]>([]);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadNotes();
  }

  private loadNotes(): void {
    this.http.get<any[]>('/api/credit-notes').subscribe({
      next: (x) => this.notes.set(x),
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to load credit notes.')),
    });
  }

  runPreview(): void {
    this.errorMessage.set(null);
    this.http.post('/api/credit-notes/preview', {
      clientId: this.clientId ? Number(this.clientId) : null,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      reason: this.reason,
      creditNoteDate: this.periodEnd,
    }).subscribe({
      next: (preview) => this.preview.set(preview),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Preview failed.')),
    });
  }

  generate(): void {
    this.errorMessage.set(null);
    this.http.post('/api/credit-notes/generate', {
      clientId: this.clientId ? Number(this.clientId) : null,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      reason: this.reason,
      creditNoteDate: this.periodEnd,
    }).subscribe({
      next: () => this.loadNotes(),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Generate failed.')),
    });
  }

  pdf(id: number): void {
    this.http.get(`/api/credit-notes/${id}/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      window.open(URL.createObjectURL(blob), '_blank');
    });
  }
}

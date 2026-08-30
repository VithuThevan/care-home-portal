import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { ToastService } from '../../../../shared/ui/toast.service';

@Component({
  selector: 'app-credit-note-workspace',
  imports: [
    FormsModule,
    DecimalPipe,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './credit-note-workspace.html',
})
export class CreditNoteWorkspacePage {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
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
      next: () => {
        this.toast.success('Credit note generated successfully.');
        this.loadNotes();
      },
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Generate failed.')),
    });
  }

  pdf(id: number): void {
    this.http.get(`/api/credit-notes/${id}/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      window.open(URL.createObjectURL(blob), '_blank');
    });
  }
}

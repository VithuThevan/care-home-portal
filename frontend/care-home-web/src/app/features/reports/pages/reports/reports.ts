import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';

@Component({
  selector: 'app-reports',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
  ],
  templateUrl: './reports.html',
})
export class ReportsPage {
  private readonly http = inject(HttpClient);
  report = 'client-census';
  from = '';
  to = '';
  readonly rows = signal<any[]>([]);
  readonly errorMessage = signal<string | null>(null);

  load(): void {
    this.errorMessage.set(null);
    let params = new HttpParams();
    if (this.from) params = params.set('from', this.from);
    if (this.to) params = params.set('to', this.to);
    this.http.get<any[]>(`/api/reports/${this.report}`, { params }).subscribe({
      next: (rows) => this.rows.set(rows),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Unable to load report.')),
    });
  }

  exportFormat(format: string): void {
    let params = new HttpParams().set('format', format);
    if (this.from) params = params.set('from', this.from);
    if (this.to) params = params.set('to', this.to);
    this.http
      .get(`/api/reports/${this.report}`, { params, responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.report}.${format === 'xlsx' ? 'xlsx' : format}`;
        a.click();
      });
  }

  keys(): string[] {
    const rows = this.rows();
    return rows[0] ? Object.keys(rows[0]) : [];
  }
}

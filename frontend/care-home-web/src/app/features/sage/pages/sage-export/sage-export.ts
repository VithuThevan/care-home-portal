import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-sage-export',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
  ],
  templateUrl: './sage-export.html',
})
export class SageExportPage implements OnInit {
  private readonly http = inject(HttpClient);
  readonly auth = inject(AuthService);
  dateFrom = '';
  dateTo = '';
  readonly preview = signal<any | null>(null);
  readonly batches = signal<any[]>([]);
  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.http.get<PagedResult<any>>('/api/sage-exports').subscribe({
      next: (x) => this.batches.set(x.items),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Unable to load exports.')),
    });
  }

  runPreview(): void {
    this.errorMessage.set(null);
    this.http
      .post('/api/sage-exports/preview', { dateFrom: this.dateFrom, dateTo: this.dateTo })
      .subscribe({
        next: (preview) => this.preview.set(preview),
        error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Preview failed.')),
      });
  }

  exportNow(): void {
    this.errorMessage.set(null);
    this.http
      .post<any>('/api/sage-exports', { dateFrom: this.dateFrom, dateTo: this.dateTo })
      .subscribe({
        next: () => this.ngOnInit(),
        error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Export failed.')),
      });
  }

  download(id: number): void {
    this.http.get(`/api/sage-exports/${id}/file`, { responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sage-export-${id}.csv`;
      a.click();
    });
  }
}

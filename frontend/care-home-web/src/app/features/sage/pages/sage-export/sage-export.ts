import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-sage-export',
  imports: [FormsModule],
  templateUrl: './sage-export.html',
})
export class SageExportPage implements OnInit {
  private readonly http = inject(HttpClient);
  dateFrom = '';
  dateTo = '';
  preview: any = null;
  batches: any[] = [];
  errorMessage = '';

  ngOnInit(): void {
    this.http.get<PagedResult<any>>('/api/sage-exports').subscribe((x) => (this.batches = x.items));
  }

  runPreview(): void {
    this.http.post('/api/sage-exports/preview', { dateFrom: this.dateFrom, dateTo: this.dateTo }).subscribe({
      next: (preview) => (this.preview = preview),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Preview failed.')),
    });
  }

  exportNow(): void {
    this.http.post<any>('/api/sage-exports', { dateFrom: this.dateFrom, dateTo: this.dateTo }).subscribe({
      next: () => this.ngOnInit(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Export failed.')),
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

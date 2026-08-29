import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { getApiErrorMessage } from '../../../../core/api-error';
import { PagedResult } from '../../../../core/models';

@Component({
  selector: 'app-invoice-list',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './invoice-list.html',
})
export class InvoiceListPage implements OnInit {
  private readonly http = inject(HttpClient);
  items: any[] = [];
  totalCount = 0;
  page = 1;
  invoiceNumber = '';
  status = '';
  paymentStatus = '';
  selected = new Set<number>();
  errorMessage = '';
  bulkMessage = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    let params = new HttpParams().set('page', this.page).set('pageSize', 50);
    if (this.invoiceNumber) params = params.set('invoiceNumber', this.invoiceNumber);
    if (this.status) params = params.set('status', this.status);
    if (this.paymentStatus) params = params.set('paymentStatus', this.paymentStatus);
    this.http.get<PagedResult<any>>('/api/invoices', { params }).subscribe({
      next: (result) => {
        this.items = result.items;
        this.totalCount = result.totalCount;
      },
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load invoices.')),
    });
  }

  toggle(id: number, checked: boolean): void {
    if (checked) this.selected.add(id);
    else this.selected.delete(id);
  }

  bulkSend(): void {
    this.http.post<any>('/api/invoices/bulk-send', { invoiceIds: [...this.selected] }).subscribe({
      next: (result) => (this.bulkMessage = `Succeeded ${result.succeeded}, failed ${result.failed}, skipped ${result.skipped}.`),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Bulk send failed.')),
    });
  }

  bulkPay(status: string): void {
    this.http.post('/api/invoices/bulk-payment-status', { invoiceIds: [...this.selected], paymentStatus: status }).subscribe({
      next: () => this.load(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Bulk payment update failed.')),
    });
  }
}

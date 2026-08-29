import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-invoice-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  invoice: any = null;
  errorMessage = '';
  info = '';

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.http.get(`/api/invoices/${id}`).subscribe({
      next: (invoice) => (this.invoice = invoice),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load invoice.')),
    });
  }

  pdf(): void {
    this.http.get(`/api/invoices/${this.invoice.id}/pdf`, { responseType: 'blob' }).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  }

  send(): void {
    this.http.post(`/api/invoices/${this.invoice.id}/send`, {}).subscribe({
      next: () => (this.info = 'Send completed (or simulated in development).'),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Send failed.')),
    });
  }

  pay(status: string): void {
    this.http.post(`/api/invoices/${this.invoice.id}/payment-status`, { paymentStatus: status }).subscribe({
      next: () => (this.invoice.paymentStatus = status),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Payment update failed.')),
    });
  }

  voidInvoice(): void {
    if (!confirm('Void this invoice? The record is retained.')) return;
    this.http.post(`/api/invoices/${this.invoice.id}/void`, {}).subscribe({
      next: () => (this.invoice.status = 'Void'),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Void failed.')),
    });
  }
}

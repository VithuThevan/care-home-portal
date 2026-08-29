import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-invoice-detail',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './invoice-detail.html',
})
export class InvoiceDetailPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly invoice = signal<any | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly isLoading = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));
      this.loadInvoice(id);
    });
  }

  private loadInvoice(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.info.set(null);
    this.invoice.set(null);

    this.http
      .get(`/api/invoices/${id}`)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (invoice) => this.invoice.set(invoice),
        error: (error) =>
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to load invoice.')),
      });
  }

  pdf(): void {
    const current = this.invoice();
    if (!current) {
      return;
    }

    this.http.get(`/api/invoices/${current.id}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to download PDF.')),
    });
  }

  send(): void {
    const current = this.invoice();
    if (!current) {
      return;
    }

    this.http.post(`/api/invoices/${current.id}/send`, {}).subscribe({
      next: () => this.info.set('Send completed (or simulated in development).'),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Send failed.')),
    });
  }

  pay(status: string): void {
    const current = this.invoice();
    if (!current) {
      return;
    }

    this.http.post(`/api/invoices/${current.id}/payment-status`, { paymentStatus: status }).subscribe({
      next: () => this.invoice.set({ ...current, paymentStatus: status }),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Payment update failed.')),
    });
  }

  voidInvoice(): void {
    const current = this.invoice();
    if (!current) {
      return;
    }

    if (!confirm('Void this invoice? The record is retained.')) {
      return;
    }

    this.http.post(`/api/invoices/${current.id}/void`, {}).subscribe({
      next: () => this.invoice.set({ ...current, status: 'Void' }),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Void failed.')),
    });
  }
}

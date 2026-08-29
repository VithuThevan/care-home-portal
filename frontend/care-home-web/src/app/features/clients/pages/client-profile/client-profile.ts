import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { getApiErrorMessage } from '../../../../core/api-error';
import { Client } from '../../models/client.model';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-profile',
  imports: [RouterLink, FormsModule, DecimalPipe],
  templateUrl: './client-profile.html',
})
export class ClientProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clients = inject(ClientService);
  private readonly http = inject(HttpClient);

  client: Client | null = null;
  tab: 'details' | 'contracts' | 'rates' | 'invoices' = 'details';
  contracts: any[] = [];
  invoices: any[] = [];
  errorMessage = '';
  authorities: any[] = [];
  categories: any[] = [];
  nominals: any[] = [];
  newContract = {
    fundingAuthorityId: 0,
    invoiceCategoryId: 0,
    nominalCodeId: 0,
    contractStartDate: '',
    contractEndDate: '',
  };
  newRate = {
    contractId: 0,
    effectiveFrom: '',
    effectiveTo: '',
    frequency: 'Weekly',
    amount: 0,
    notes: '',
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.clients.getClient(id).subscribe({
      next: (client) => {
        this.client = client;
        this.loadContracts();
        this.loadInvoices();
      },
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load client.')),
    });
    this.http.get<any[]>('/api/funding-authorities?activeOnly=true').subscribe((x) => (this.authorities = x));
    this.http.get<any[]>('/api/invoice-categories?activeOnly=true').subscribe((x) => (this.categories = x));
    this.http.get<any[]>('/api/nominal-codes?activeOnly=true').subscribe((x) => (this.nominals = x));
  }

  loadContracts(): void {
    if (!this.client) return;
    this.http.get<any[]>(`/api/clients/${this.client.id}/funding-contracts`).subscribe((x) => (this.contracts = x));
  }

  loadInvoices(): void {
    if (!this.client) return;
    this.http.get<any>('/api/invoices', { params: { clientId: this.client.id } }).subscribe((x) => (this.invoices = x.items ?? []));
  }

  saveContract(): void {
    if (!this.client) return;
    this.http.post(`/api/clients/${this.client.id}/funding-contracts`, this.newContract).subscribe({
      next: () => this.loadContracts(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to save contract.')),
    });
  }

  addRate(): void {
    this.http.post(`/api/funding-contracts/${this.newRate.contractId}/rates`, {
      effectiveFrom: this.newRate.effectiveFrom,
      effectiveTo: this.newRate.effectiveTo || null,
      frequency: this.newRate.frequency,
      amount: this.newRate.amount,
      notes: this.newRate.notes,
      closePreviousOpenEnded: true,
    }).subscribe({
      next: () => this.loadContracts(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to add rate.')),
    });
  }
}

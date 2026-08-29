import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { getApiErrorMessage } from '../../../../core/api-error';
import { Company } from '../../../companies/models/company.model';
import { CompanyService } from '../../../companies/services/company.service';
import { CareHomeLocation } from '../../../care-homes/models/care-home.model';
import { CareHomeService } from '../../../care-homes/services/care-home.service';
import { InvoiceCategory } from '../../../invoice-categories/models/invoice-category.model';
import { InvoiceCategoryService } from '../../../invoice-categories/services/invoice-category.service';
import { ClientService } from '../../../clients/services/client.service';
import { Client } from '../../../clients/models/client.model';

@Component({
  selector: 'app-billing-workspace',
  imports: [FormsModule, RouterLink, DecimalPipe],
  templateUrl: './billing-workspace.html',
})
export class BillingWorkspacePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly companiesApi = inject(CompanyService);
  private readonly homesApi = inject(CareHomeService);
  private readonly categoriesApi = inject(InvoiceCategoryService);
  private readonly clientsApi = inject(ClientService);

  companies: Company[] = [];
  careHomes: CareHomeLocation[] = [];
  categories: InvoiceCategory[] = [];
  clients: Client[] = [];
  companyId = 0;
  careHomeId = 0;
  invoiceCategoryId = 0;
  periodStart = '';
  periodEnd = '';
  selectedClientIds: number[] = [];
  preview: any = null;
  generateResult: any = null;
  errorMessage = '';
  isWorking = false;

  ngOnInit(): void {
    this.companiesApi.getCompanies().subscribe((x) => (this.companies = x.filter((c) => c.isActive)));
    this.homesApi.getCareHomes().subscribe((x) => (this.careHomes = x.filter((h) => h.isActive)));
    this.categoriesApi.getInvoiceCategories().subscribe((x) => (this.categories = x.filter((c) => c.isActive)));
    this.clientsApi.getClients(undefined, undefined, false).subscribe((page) => (this.clients = page.items));
  }

  runPreview(): void {
    this.errorMessage = '';
    this.generateResult = null;
    this.isWorking = true;
    this.http.post('/api/billing/preview', this.body()).subscribe({
      next: (result) => {
        this.preview = result;
        this.isWorking = false;
      },
      error: (error) => {
        this.isWorking = false;
        this.errorMessage = getApiErrorMessage(error, 'Preview failed.');
      },
    });
  }

  generate(): void {
    if (!this.preview?.canGenerate) {
      return;
    }
    this.isWorking = true;
    this.http.post('/api/billing/generate', this.body()).subscribe({
      next: (result) => {
        this.generateResult = result;
        this.isWorking = false;
        this.runPreview();
      },
      error: (error) => {
        this.isWorking = false;
        this.errorMessage = getApiErrorMessage(error, 'Generation failed.');
      },
    });
  }

  private body() {
    return {
      companyId: this.companyId,
      careHomeId: this.careHomeId || null,
      invoiceCategoryId: this.invoiceCategoryId || null,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      clientIds: this.selectedClientIds.length ? this.selectedClientIds : null,
    };
  }
}

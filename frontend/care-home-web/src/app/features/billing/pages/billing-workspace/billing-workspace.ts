import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { ToastService } from '../../../../shared/ui/toast.service';
import { billingExceptionLabel } from '../../../../shared/ui/billing-exception';
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
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
  ],
  templateUrl: './billing-workspace.html',
})
export class BillingWorkspacePage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly companiesApi = inject(CompanyService);
  private readonly homesApi = inject(CareHomeService);
  private readonly categoriesApi = inject(InvoiceCategoryService);
  private readonly clientsApi = inject(ClientService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly companies = signal<Company[]>([]);
  readonly careHomes = signal<CareHomeLocation[]>([]);
  readonly categories = signal<InvoiceCategory[]>([]);
  readonly clients = signal<Client[]>([]);
  readonly preview = signal<any | null>(null);
  readonly generateResult = signal<any | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isWorking = signal(false);

  companyId = 0;
  careHomeId = 0;
  invoiceCategoryId = 0;
  periodStart = '';
  periodEnd = '';
  selectedClientIds: number[] = [];

  ngOnInit(): void {
    this.companiesApi
      .getCompanies()
      .subscribe((x) => this.companies.set(x.filter((c) => c.isActive)));
    this.homesApi.getCareHomes().subscribe((x) => this.careHomes.set(x.filter((h) => h.isActive)));
    this.categoriesApi
      .getInvoiceCategories()
      .subscribe((x) => this.categories.set(x.filter((c) => c.isActive)));
    this.clientsApi
      .getClients(undefined, undefined, false)
      .subscribe((page) => this.clients.set(page.items));
  }

  runPreview(): void {
    this.errorMessage.set(null);
    this.generateResult.set(null);
    this.isWorking.set(true);
    this.http
      .post('/api/billing/preview', this.body())
      .pipe(finalize(() => this.isWorking.set(false)))
      .subscribe({
        next: (result) => this.preview.set(result),
        error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Preview failed.')),
      });
  }

  generate(): void {
    if (!this.preview()?.canGenerate) {
      return;
    }
    this.isWorking.set(true);
    this.http
      .post('/api/billing/generate', this.body())
      .pipe(finalize(() => this.isWorking.set(false)))
      .subscribe({
        next: (result) => {
          this.generateResult.set(result);
          this.toast.success('Invoice generated successfully.');
          this.runPreview();
        },
        error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Generation failed.')),
      });
  }

  exceptionLabel(code: string, message: string): string {
    return billingExceptionLabel(code, message);
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

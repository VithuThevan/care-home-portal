import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-invoice-template-list',
  imports: [ReactiveFormsModule],
  templateUrl: './invoice-template-list.html',
})
export class InvoiceTemplateListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly items = signal<any[]>([]);
  readonly categories = signal<any[]>([]);
  readonly errorMessage = signal<string | null>(null);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    invoiceCategoryId: [0, Validators.min(1)],
    headerText1: [''],
    footerText: [''],
    bankAccountName: [''],
    sortCode: [''],
    accountNumber: [''],
    contactName: [''],
    contactEmail: [''],
    emailSubjectTemplate: ['Invoice {{InvoiceNumber}}'],
    emailBodyTemplate: ['Please find the invoice attached.'],
  });

  ngOnInit(): void {
    this.http.get<any[]>('/api/invoice-templates').subscribe({
      next: (x) => this.items.set(x),
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to load templates.')),
    });
    this.http.get<any[]>('/api/invoice-categories?activeOnly=true').subscribe({
      next: (x) => this.categories.set(x),
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to load categories.')),
    });
  }

  save(): void {
    this.errorMessage.set(null);
    this.http.post('/api/invoice-templates', this.form.getRawValue()).subscribe({
      next: () => this.ngOnInit(),
      error: (error) =>
        this.errorMessage.set(getApiErrorMessage(error, 'Unable to save template.')),
    });
  }
}

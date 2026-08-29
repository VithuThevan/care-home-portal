import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';

@Component({
  selector: 'app-invoice-template-list',
  imports: [ReactiveFormsModule],
  templateUrl: './invoice-template-list.html',
})
export class InvoiceTemplateListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  items: any[] = [];
  categories: any[] = [];
  errorMessage = '';
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
    this.http.get<any[]>('/api/invoice-templates').subscribe((x) => (this.items = x));
    this.http.get<any[]>('/api/invoice-categories?activeOnly=true').subscribe((x) => (this.categories = x));
  }

  save(): void {
    this.http.post('/api/invoice-templates', this.form.getRawValue()).subscribe({
      next: () => this.ngOnInit(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to save template.')),
    });
  }
}

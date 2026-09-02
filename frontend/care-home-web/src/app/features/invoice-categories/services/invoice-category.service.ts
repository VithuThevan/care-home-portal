import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateInvoiceCategoryRequest,
  InvoiceCategory,
  UpdateInvoiceCategoryRequest,
} from '../models/invoice-category.model';

@Injectable({
  providedIn: 'root',
})
export class InvoiceCategoryService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/invoice-categories';

  getInvoiceCategories(): Observable<InvoiceCategory[]> {
    return this.http.get<InvoiceCategory[]>(this.apiUrl);
  }

  getInvoiceCategory(id: number): Observable<InvoiceCategory> {
    return this.http.get<InvoiceCategory>(`${this.apiUrl}/${id}`);
  }

  createInvoiceCategory(request: CreateInvoiceCategoryRequest): Observable<InvoiceCategory> {
    return this.http.post<InvoiceCategory>(this.apiUrl, request);
  }

  updateInvoiceCategory(
    id: number,
    request: UpdateInvoiceCategoryRequest,
  ): Observable<InvoiceCategory> {
    return this.http.put<InvoiceCategory>(`${this.apiUrl}/${id}`, request);
  }

  deactivateInvoiceCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

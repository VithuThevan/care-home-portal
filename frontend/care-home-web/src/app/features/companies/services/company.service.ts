import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest
} from '../models/company.model';

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:5092/api/companies';

  getCompanies(): Observable<Company[]> {
    return this.http.get<Company[]>(this.apiUrl);
  }

  getCompany(id: number): Observable<Company> {
    return this.http.get<Company>(
      `${this.apiUrl}/${id}`
    );
  }

  createCompany(
    request: CreateCompanyRequest
  ): Observable<Company> {
    return this.http.post<Company>(
      this.apiUrl,
      request
    );
  }

  updateCompany(
    id: number,
    request: UpdateCompanyRequest
  ): Observable<Company> {
    return this.http.put<Company>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  deactivateCompany(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateFundingAuthorityRequest,
  FundingAuthority,
  UpdateFundingAuthorityRequest
} from '../models/funding-authority.model';

@Injectable({
  providedIn: 'root'
})
export class FundingAuthorityService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/funding-authorities';

  getFundingAuthorities(): Observable<FundingAuthority[]> {
    return this.http.get<FundingAuthority[]>(this.apiUrl);
  }

  getFundingAuthority(id: number): Observable<FundingAuthority> {
    return this.http.get<FundingAuthority>(`${this.apiUrl}/${id}`);
  }

  createFundingAuthority(
    request: CreateFundingAuthorityRequest
  ): Observable<FundingAuthority> {
    return this.http.post<FundingAuthority>(this.apiUrl, request);
  }

  updateFundingAuthority(
    id: number,
    request: UpdateFundingAuthorityRequest
  ): Observable<FundingAuthority> {
    return this.http.put<FundingAuthority>(`${this.apiUrl}/${id}`, request);
  }

  deactivateFundingAuthority(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

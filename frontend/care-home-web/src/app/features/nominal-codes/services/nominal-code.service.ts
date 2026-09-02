import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CreateNominalCodeRequest,
  NominalCode,
  UpdateNominalCodeRequest,
} from '../models/nominal-code.model';

@Injectable({
  providedIn: 'root',
})
export class NominalCodeService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = '/api/nominal-codes';

  getNominalCodes(): Observable<NominalCode[]> {
    return this.http.get<NominalCode[]>(this.apiUrl);
  }

  getNominalCode(id: number): Observable<NominalCode> {
    return this.http.get<NominalCode>(`${this.apiUrl}/${id}`);
  }

  createNominalCode(request: CreateNominalCodeRequest): Observable<NominalCode> {
    return this.http.post<NominalCode>(this.apiUrl, request);
  }

  updateNominalCode(id: number, request: UpdateNominalCodeRequest): Observable<NominalCode> {
    return this.http.put<NominalCode>(`${this.apiUrl}/${id}`, request);
  }

  deactivateNominalCode(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

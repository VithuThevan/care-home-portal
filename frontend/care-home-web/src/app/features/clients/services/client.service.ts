import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Client,
  CreateClientRequest,
  UpdateClientRequest
} from '../models/client.model';

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    '/api/clients';

  getClients(
    search?: string,
    careHomeId?: number,
    includeArchived = false
  ): Observable<Client[]> {

    let params =
      new HttpParams();

    if (search) {
      params =
        params.set('search', search);
    }

    if (careHomeId) {
      params =
        params.set(
          'careHomeId',
          careHomeId
        );
    }

    if (includeArchived) {
      params =
        params.set(
          'includeArchived',
          'true'
        );
    }

    return this.http.get<Client[]>(
      this.apiUrl,
      { params }
    );
  }

  getClient(
    id: number
  ): Observable<Client> {

    return this.http.get<Client>(
      `${this.apiUrl}/${id}`
    );
  }

  createClient(
    request: CreateClientRequest
  ): Observable<Client> {

    return this.http.post<Client>(
      this.apiUrl,
      request
    );
  }

  updateClient(
    id: number,
    request: UpdateClientRequest
  ): Observable<Client> {

    return this.http.put<Client>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  archiveClient(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
    CareHomeLocation,
    CreateCareHomeRequest,
    UpdateCareHomeRequest
} from '../models/care-home.model';

@Injectable({
    providedIn: 'root'
})
export class CareHomeService {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        'http://localhost:5092/api/care-homes';

    getCareHomes(): Observable<CareHomeLocation[]> {
        return this.http.get<CareHomeLocation[]>(
            this.apiUrl
        );
    }

    getCareHome(id: number): Observable<CareHomeLocation> {
        return this.http.get<CareHomeLocation>(
            `${this.apiUrl}/${id}`
        );
    }

    createCareHome(
        request: CreateCareHomeRequest
    ): Observable<CareHomeLocation> {

        return this.http.post<CareHomeLocation>(
            this.apiUrl,
            request
        );
    }

    updateCareHome(
        id: number,
        request: UpdateCareHomeRequest
    ): Observable<CareHomeLocation> {

        return this.http.put<CareHomeLocation>(
            `${this.apiUrl}/${id}`,
            request
        );
    }

    deactivateCareHome(
        id: number
    ): Observable<void> {

        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }
}
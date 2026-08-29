import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { getApiErrorMessage } from '../../../../core/api-error';
import { CareHomeService } from '../../../care-homes/services/care-home.service';
import { CareHomeLocation } from '../../../care-homes/models/care-home.model';

@Component({
  selector: 'app-user-list',
  imports: [ReactiveFormsModule],
  templateUrl: './user-list.html',
})
export class UserListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly homesApi = inject(CareHomeService);
  users: any[] = [];
  homes: CareHomeLocation[] = [];
  errorMessage = '';
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    password: ['', Validators.required],
    role: ['ReadOnly', Validators.required],
  });
  selectedHomes: number[] = [];

  ngOnInit(): void {
    this.http.get<any[]>('/api/users').subscribe({
      next: (users) => (this.users = users),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to load users.')),
    });
    this.homesApi.getCareHomes().subscribe((x) => (this.homes = x));
  }

  toggleHome(id: number, checked: boolean): void {
    if (checked) this.selectedHomes.push(id);
    else this.selectedHomes = this.selectedHomes.filter((x) => x !== id);
  }

  create(): void {
    this.http.post('/api/users', { ...this.form.getRawValue(), careHomeIds: this.selectedHomes }).subscribe({
      next: () => this.ngOnInit(),
      error: (error) => (this.errorMessage = getApiErrorMessage(error, 'Unable to create user.')),
    });
  }

  deactivate(id: string): void {
    this.http.post(`/api/users/${id}/deactivate`, {}).subscribe({ next: () => this.ngOnInit() });
  }
}

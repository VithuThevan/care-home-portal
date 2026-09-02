import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';

import { getApiErrorMessage } from '../../../../core/api-error';
import { AuthService } from '../../../../core/auth.service';
import { CareHomeService } from '../../../care-homes/services/care-home.service';
import { CareHomeLocation } from '../../../care-homes/models/care-home.model';
import { PageHeaderComponent } from '../../../../shared/ui/page-header';
import { ApiErrorComponent } from '../../../../shared/ui/api-error';
import { StatusBadgeComponent } from '../../../../shared/ui/status-badge';
import { ConfirmDialogService } from '../../../../shared/ui/confirm-dialog.service';
import { ToastService } from '../../../../shared/ui/toast.service';

@Component({
  selector: 'app-user-list',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    PageHeaderComponent,
    ApiErrorComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './user-list.html',
})
export class UserListPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly homesApi = inject(CareHomeService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly users = signal<any[]>([]);
  readonly homes = signal<CareHomeLocation[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isSaving = signal(false);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    displayName: ['', Validators.required],
    password: ['', Validators.required],
    role: ['ReadOnly', Validators.required],
  });
  selectedHomes: number[] = [];

  ngOnInit(): void {
    this.http.get<any[]>('/api/users').subscribe({
      next: (users) => this.users.set(users),
      error: (error) => this.errorMessage.set(getApiErrorMessage(error, 'Unable to load users.')),
    });
    this.homesApi.getCareHomes().subscribe((x) => this.homes.set(x));
  }

  homeNames(ids: number[] | undefined): string {
    if (!ids?.length) {
      return 'All accessible homes';
    }
    const names = this.homes()
      .filter((home) => ids.includes(home.id))
      .map((home) => home.name);
    return names.join(', ') || String(ids.length);
  }

  toggleHome(id: number, checked: boolean): void {
    if (checked) this.selectedHomes.push(id);
    else this.selectedHomes = this.selectedHomes.filter((x) => x !== id);
  }

  create(event?: Event): void {
    event?.preventDefault();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.errorMessage.set(null);
    this.isSaving.set(true);
    const { email, displayName, password, role } = this.form.getRawValue();
    this.auth
      .encryptSecret(password)
      .pipe(
        switchMap((passwordCipher) =>
          this.http.post('/api/users', {
            email,
            displayName,
            role,
            careHomeIds: this.selectedHomes,
            passwordCipher,
          }),
        ),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success('User created successfully.');
          this.ngOnInit();
        },
        error: (error) =>
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to create user.')),
      });
  }

  deactivate(id: string): void {
    this.confirm
      .confirm({
        title: 'Deactivate user',
        message: 'Deactivate this user? They will no longer be able to sign in.',
        confirmLabel: 'Deactivate',
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.http.post(`/api/users/${id}/deactivate`, {}).subscribe({
          next: () => {
            this.toast.success('User deactivated successfully.');
            this.ngOnInit();
          },
        });
      });
  }
}

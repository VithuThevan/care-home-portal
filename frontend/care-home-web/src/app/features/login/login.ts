import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { getApiErrorMessage } from '../../core/api-error';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly errorMessage = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    this.auth
      .login(email, password)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          void this.router.navigate(this.auth.homePath());
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to sign in.'));
        },
      });
  }
}

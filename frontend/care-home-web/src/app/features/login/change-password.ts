import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

import { AuthService } from '../../core/auth.service';
import { getApiErrorMessage } from '../../core/api-error';
import { ApiErrorComponent } from '../../shared/ui/api-error';
import { ToastService } from '../../shared/ui/toast.service';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, ApiErrorComponent],
  templateUrl: './change-password.html',
})
export class ChangePasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly errorMessage = signal<string | null>(null);
  readonly isSaving = signal(false);

  readonly form = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, strongPassword]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit(event?: Event): void {
    event?.preventDefault();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.auth
      .changePassword(currentPassword, newPassword)
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.toast.success('Password updated. You now have access to the system.');
          void this.router.navigate(this.auth.homePath());
        },
        error: (error) => {
          this.errorMessage.set(getApiErrorMessage(error, 'Unable to change password.'));
        },
      });
  }

  signOut(): void {
    this.auth.logout();
  }
}

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  if (value.length < 12) {
    return { minlength: true };
  }
  if (!/[A-Z]/.test(value)) {
    return { uppercase: true };
  }
  if (!/[a-z]/.test(value)) {
    return { lowercase: true };
  }
  if (!/\d/.test(value)) {
    return { digit: true };
  }
  if (!/[^A-Za-z0-9]/.test(value)) {
    return { special: true };
  }
  return null;
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const next = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return next && confirm && next !== confirm ? { mismatch: true } : null;
}

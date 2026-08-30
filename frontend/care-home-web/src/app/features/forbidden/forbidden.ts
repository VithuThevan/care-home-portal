import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="page">
      <h1 class="text-2xl font-semibold">Access denied</h1>
      <p class="text-sm text-[var(--app-text-muted)]">You do not have permission to view this page.</p>
      <a mat-stroked-button routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenPage {}

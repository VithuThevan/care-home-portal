import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <div class="page">
      <h1>403 — Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <a routerLink="/dashboard">Back to dashboard</a>
    </div>
  `,
})
export class ForbiddenPage {}

import { Component, input } from '@angular/core';

@Component({
  selector: 'app-api-error',
  template: `
    @if (message()) {
      <div class="mb-4 rounded-md border border-[#f5c2c0] bg-[#fdecea] px-4 py-3 text-sm text-[var(--app-danger)]" role="alert">
        {{ message() }}
      </div>
    }
  `,
})
export class ApiErrorComponent {
  readonly message = input<string | null>(null);
}

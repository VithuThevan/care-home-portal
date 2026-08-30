import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="panel text-center">
      <h2 class="m-0 text-lg font-semibold text-[var(--app-text)]">{{ title() }}</h2>
      @if (message()) {
        <p class="mt-2 mb-0 text-sm text-[var(--app-text-muted)]">{{ message() }}</p>
      }
      <div class="mt-4">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input('');
}

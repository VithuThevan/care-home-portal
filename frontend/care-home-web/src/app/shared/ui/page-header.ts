import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        <h1 class="m-0 text-[1.75rem] font-semibold tracking-tight text-[var(--app-text)]">
          {{ title() }}
        </h1>
        @if (subtitle()) {
          <p class="mt-1 mb-0 text-sm text-[var(--app-text-muted)]">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}

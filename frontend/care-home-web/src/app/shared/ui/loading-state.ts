import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading-state',
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="flex items-center gap-3 py-4 text-sm text-[var(--app-text-muted)]">
      <mat-progress-spinner diameter="24" mode="indeterminate" />
      <span>{{ label() }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  readonly label = input('Loading...');
}

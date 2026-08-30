import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';

import { NotFoundPage } from './not-found';

describe('NotFoundPage', () => {
  it('should render a controlled not found message', async () => {
    await TestBed.configureTestingModule({
      imports: [NotFoundPage],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    const fixture = TestBed.createComponent(NotFoundPage);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Page not found');
    expect(fixture.nativeElement.textContent).toContain('Sign in');
  });

  it('should activate for an unknown SPA path', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: NotFoundPage }]),
        provideHttpClient(),
      ],
    });

    const router = TestBed.inject(Router);
    await router.navigateByUrl('/something-that-does-not-exist');
    expect(router.routerState.snapshot.root.firstChild?.component).toBe(NotFoundPage);
  });
});

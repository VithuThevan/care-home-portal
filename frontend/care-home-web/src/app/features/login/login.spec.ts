import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { LoginPage } from './login';

class AuthStub {
  current = new Subject<never>();

  login(_email: string, _password: string) {
    this.current = new Subject<never>();
    return this.current.asObservable();
  }

  homePath() {
    return ['/dashboard'];
  }
}

describe('LoginPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useClass: AuthStub },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    await fixture.whenStable();
    return {
      fixture,
      component: fixture.componentInstance,
      auth: TestBed.inject(AuthService) as unknown as AuthStub,
    };
  }

  it('masks the password in the field and keeps it out of the page and URL form', async () => {
    const { fixture, component } = await setup();
    const secret = 'Test password';
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const passwordInput = fixture.nativeElement.querySelector(
      'input[formcontrolname="password"]',
    ) as HTMLInputElement;

    expect(form.method.toLowerCase()).toBe('post');
    expect(passwordInput.type).toBe('password');
    expect(passwordInput.getAttribute('type')).toBe('password');

    component.form.setValue({
      email: 'admin@localhost',
      password: secret,
    });
    fixture.detectChanges();

    expect(passwordInput.type).toBe('password');
    expect(fixture.nativeElement.textContent).not.toContain(secret);
  });

  it('stops loading and makes Sign in usable after a failed attempt', async () => {
    const { fixture, component, auth } = await setup();

    component.form.setValue({
      email: 'admin@localhost',
      password: 'WrongPassword!1',
    });
    component.submit();
    fixture.detectChanges();

    const pending = submitButton(fixture.nativeElement);
    expect(component.isSaving()).toBe(true);
    expect(component.form.disabled).toBe(true);
    expect(pending.disabled).toBe(true);
    expect(pending.textContent).toContain('Signing in');

    auth.current.error({ error: { message: 'Invalid email or password.' } });
    fixture.detectChanges();

    const recovered = submitButton(fixture.nativeElement);
    expect(component.isSaving()).toBe(false);
    expect(component.form.enabled).toBe(true);
    expect(component.errorMessage()).toBe('Invalid email or password.');
    expect(recovered.disabled).toBe(false);
    expect(recovered.textContent).toContain('Sign in');

    component.form.controls.password.setValue('CorrectPassword!1');
    component.submit();
    fixture.detectChanges();

    expect(component.isSaving()).toBe(true);
    expect(submitButton(fixture.nativeElement).disabled).toBe(true);
    auth.current.error({ error: { message: 'Invalid email or password.' } });
    fixture.detectChanges();
    expect(component.isSaving()).toBe(false);
    expect(submitButton(fixture.nativeElement).disabled).toBe(false);
  });
});

function submitButton(host: HTMLElement): HTMLButtonElement {
  return host.querySelector('button[type="submit"]') as HTMLButtonElement;
}

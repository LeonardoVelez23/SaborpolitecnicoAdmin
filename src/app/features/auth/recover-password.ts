import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, FormField, maxLength, pattern, required, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api/api';
import { AuthApi } from '../../core/auth/auth-api';
import { passwordPolicyError } from '../../core/auth/password-policy';
import { ToastService } from '../../core/ui/toast.service';

/** Recuperar contraseña con el código OTP del correo (RF-05). */
@Component({
  selector: 'sh-recover-password',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recover-password.html',
  styleUrl: './auth-card.css',
})
export class RecoverPassword {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly step = signal<'email' | 'code'>('email');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly info = signal<string | undefined>(undefined);

  protected readonly emailModel = signal({ email: '' });
  protected readonly emailForm = form(this.emailModel, (path) => {
    required(path.email, { message: 'Ingresa tu correo electrónico.' });
    email(path.email, { message: 'Ingresa un correo válido.' });
  });

  protected readonly resetModel = signal({ otp: '', password: '', confirm: '' });
  protected readonly resetForm = form(this.resetModel, (path) => {
    required(path.otp, { message: 'Ingresa el código que recibiste.' });
    pattern(path.otp, /^\d{6}$/, { message: 'El código tiene 6 dígitos.' });
    maxLength(path.otp, 6);
    required(path.password, { message: 'Ingresa la nueva contraseña.' });
    validate(path.password, ({ value }) => {
      const message = passwordPolicyError(value());
      return message ? { kind: 'policy', message } : undefined;
    });
    validate(path.confirm, ({ value, valueOf }) =>
      value() === valueOf(path.password) ? undefined : { kind: 'mismatch', message: 'Las contraseñas no coinciden.' },
    );
  });

  protected onRequestCode(event: Event): void {
    event.preventDefault();
    void submit(this.emailForm, async () => {
      await this.run(async () => {
        const message = await this.authApi.requestCode(this.emailModel().email);
        this.info.set(message);
        this.step.set('code');
      });
    });
  }

  protected onReset(event: Event): void {
    event.preventDefault();
    void submit(this.resetForm, async () => {
      await this.run(async () => {
        const { otp, password } = this.resetModel();
        const message = await this.authApi.resetPassword(this.emailModel().email, otp, password);
        this.toasts.success(message || 'Contraseña actualizada. Ya puedes iniciar sesión.');
        await this.router.navigateByUrl('/login');
      });
    });
  }

  protected backToEmail(): void {
    this.step.set('email');
    this.info.set(undefined);
    this.error.set(undefined);
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    this.error.set(undefined);
    try {
      await action();
    } catch (e) {
      this.error.set(errorMessage(e));
    } finally {
      this.busy.set(false);
    }
  }
}

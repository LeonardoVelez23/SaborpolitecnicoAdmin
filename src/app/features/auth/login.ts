import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/api/api';
import { AuthApi } from '../../core/auth/auth-api';
import { homeFor } from '../../core/auth/roles';
import { SessionStore } from '../../core/auth/session-store';

export const CLIENT_NOT_ALLOWED =
  'Este panel es solo para el personal. Usa la app SaborHub para hacer pedidos.';

/** Inicio de sesión del personal (RF-02, RF-03). */
@Component({
  selector: 'sh-login',
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './auth-card.css',
})
export class Login implements OnInit {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly model = signal({ identifier: '', password: '' });
  protected readonly loginForm = form(this.model, (path) => {
    required(path.identifier, { message: 'Ingresa tu correo o identificación.' });
    required(path.password, { message: 'Ingresa tu contraseña.' });
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | undefined>(undefined);
  protected readonly expiredNotice = signal(false);
  protected readonly showPassword = signal(false);

  ngOnInit(): void {
    if (this.session.expired()) {
      this.expiredNotice.set(true);
      this.session.acknowledgeExpired();
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    void submit(this.loginForm, async () => {
      this.busy.set(true);
      this.error.set(undefined);
      this.expiredNotice.set(false);
      try {
        const { identifier, password } = this.model();
        const result = await this.authApi.login(identifier, password);
        if (result.kind === 'client') {
          this.error.set(CLIENT_NOT_ALLOWED);
          return;
        }
        this.session.start(result.token, result.user);
        await this.router.navigateByUrl(homeFor(result.user.rol));
      } catch (e) {
        this.error.set(errorMessage(e));
      } finally {
        this.busy.set(false);
      }
    });
  }
}

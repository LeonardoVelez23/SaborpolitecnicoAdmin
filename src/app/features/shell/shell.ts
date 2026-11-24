import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { menuFor, PROFILE_ITEM, ROLE_LABELS } from '../../core/auth/roles';
import { SessionStore } from '../../core/auth/session-store';

/** Estructura del panel con sesión: menú lateral por rol y cabecera. */
@Component({
  selector: 'sh-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.html',
  styleUrl: './shell.css',
  host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class Shell {
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly user = this.session.user;
  protected readonly menu = computed(() => {
    const role = this.session.role();
    return role ? menuFor(role) : [];
  });
  protected readonly profileItem = PROFILE_ITEM;
  protected readonly roleLabel = computed(() => {
    const role = this.session.role();
    return role ? ROLE_LABELS[role] : '';
  });
  protected readonly menuOpen = signal(false);

  /** Título de la sección: `data.title` de la ruta hija activa. */
  protected readonly sectionTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.currentTitle()),
    ),
    { initialValue: this.currentTitle() },
  );

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.session.end();
    void this.router.navigateByUrl('/login');
  }

  private currentTitle(): string {
    let route = this.route.snapshot;
    while (route.firstChild) route = route.firstChild;
    return (route.data['title'] as string | undefined) ?? '';
  }
}

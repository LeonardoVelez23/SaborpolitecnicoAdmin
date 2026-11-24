import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Sección aún no construida: indica qué hará y en qué etapa llega. */
@Component({
  selector: 'sh-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="card">
      <h2>En construcción</h2>
      <p>{{ description }}</p>
      <p class="muted">Llega en la etapa {{ stage }} del módulo de administración.</p>
    </section>
  `,
  styles: `
    .card {
      padding: 1.5rem;
      background: var(--sh-bg-secondary);
      border: 1px solid var(--sh-border);
      border-radius: var(--sh-radius-lg);
    }
    h2 {
      margin-top: 0;
    }
    .muted {
      color: var(--sh-text-secondary);
      margin-bottom: 0;
    }
  `,
})
export class ComingSoon {
  private readonly data = inject(ActivatedRoute).snapshot.data;
  protected readonly description = (this.data['description'] as string | undefined) ?? '';
  protected readonly stage = (this.data['stage'] as string | undefined) ?? '';
}

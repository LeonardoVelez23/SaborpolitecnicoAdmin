import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/** Región de notificaciones; va una sola vez en `App`. */
@Component({
  selector: 'sh-toasts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div [class]="'toast toast--' + toast.kind" [attr.role]="toast.kind === 'error' ? 'alert' : null">
          <span>{{ toast.message }}</span>
          <button type="button" class="toast__close" aria-label="Cerrar aviso" (click)="toastService.dismiss(toast.id)">
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(420px, calc(100vw - 2rem));
    }
    .toast {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: var(--sh-radius-md);
      border: 1px solid var(--sh-border);
      background: var(--sh-bg-secondary);
      color: var(--sh-text-primary);
      box-shadow: var(--sh-shadow);
    }
    .toast span {
      flex: 1;
    }
    .toast--success {
      border-left: 4px solid var(--sh-success);
    }
    .toast--error {
      border-left: 4px solid var(--sh-danger);
    }
    .toast--info {
      border-left: 4px solid var(--sh-info);
    }
    .toast__close {
      border: 0;
      background: transparent;
      color: var(--sh-text-secondary);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class Toasts {
  protected readonly toastService = inject(ToastService);
}

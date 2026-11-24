import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { ToastService } from './core/ui/toast.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('muestra los avisos (toasts)', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(ToastService).success('Guardado');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Guardado');
  });
});

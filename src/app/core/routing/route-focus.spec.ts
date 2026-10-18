import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ApplicationRef, Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteFocus } from './route-focus';

@Component({ template: '<h1>Heading</h1><button type="button">Filter</button>' })
class WithHeading {}

@Component({ template: '<p>No heading</p>' })
class WithoutHeading {}

@Component({ imports: [RouterOutlet], template: '<a href="/elsewhere">Link</a><main><router-outlet /></main>' })
class Shell {}

describe('RouteFocus', () => {
  let router: Router;
  let announce: ReturnType<typeof vi.fn>;

  async function navigate(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(async () => {
    announce = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideLocationMocks(),
        provideRouter([
          { path: 'heading', title: 'With heading', component: WithHeading },
          { path: 'plain', title: 'Without heading', component: WithoutHeading },
        ]),
        { provide: LiveAnnouncer, useValue: { announce } },
      ],
    });
    TestBed.createComponent(Shell);
    TestBed.inject(RouteFocus).start();
    router = TestBed.inject(Router);

    document.querySelector<HTMLElement>('a')!.focus();
    await navigate('/plain');
  });

  it('leaves focus alone after the first navigation', () => {
    expect(document.activeElement?.textContent).toBe('Link');
    expect(announce).not.toHaveBeenCalled();
  });

  it("focuses the new page's h1 and announces its title", async () => {
    await navigate('/heading');

    const h1 = document.querySelector('main h1');
    expect(document.activeElement).toBe(h1);
    expect(h1?.getAttribute('tabindex')).toBe('-1');
    expect(announce).toHaveBeenCalledExactlyOnceWith('With heading');
  });

  it('focuses main on a page without an h1', async () => {
    await navigate('/heading');
    await navigate('/plain');

    expect(document.activeElement).toBe(document.querySelector('main'));
    expect(announce).toHaveBeenLastCalledWith('Without heading');
  });

  it('leaves focus on a control in the page that only changed the query', async () => {
    await navigate('/heading');
    const button = document.querySelector<HTMLElement>('main button')!;
    button.focus();

    await navigate('/heading?category=game-updates');

    expect(document.activeElement).toBe(button);
    expect(announce).toHaveBeenCalledOnce();
  });
});

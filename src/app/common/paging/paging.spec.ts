import { Injector, provideZonelessChangeDetection, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { paging, Paging } from './paging';

// The pages after the first belong to the list they were loaded for; mixed in, a list would show another's posts
describe('paging', () => {
  const list = signal('a');
  /** One response per request, answered by the test */
  let responses: Map<number, Subject<string>>;
  let pages: Paging<number, string>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    list.set('a');
    responses = new Map();
    pages = runInInjectionContext(TestBed.inject(Injector), () =>
      paging({
        reset: list,
        fetch: (request: number) => {
          const response = new Subject<string>();
          responses.set(request, response);
          return response;
        },
      }),
    );
  });

  it('adds the pages in the order they load', () => {
    pages.load(1);
    expect(pages.loading()).toBe(true);
    responses.get(1)!.next('page 1');
    pages.load(2);
    responses.get(2)!.next('page 2');

    expect(pages.pages()).toEqual(['page 1', 'page 2']);
    expect(pages.loading()).toBe(false);
  });

  it('keeps the failed request for a retry, and clears it once that loads', () => {
    pages.load(1);
    responses.get(1)!.error(new Error('down'));
    expect(pages.failed()).toBe(1);
    expect(pages.loading()).toBe(false);

    pages.retry();
    expect(pages.failed()).toBeUndefined();
    responses.get(1)!.next('page 1');
    expect(pages.pages()).toEqual(['page 1']);
  });

  it('cancels a page still loading when another one is asked for', () => {
    pages.load(1);
    pages.load(2);

    expect(responses.get(1)!.observed).toBe(false);
    responses.get(2)!.next('page 2');
    expect(pages.pages()).toEqual(['page 2']);
  });

  it('starts over with another list, ignoring a page that arrives for the old one', () => {
    pages.load(1);
    responses.get(1)!.next('a 1');
    pages.load(2);

    list.set('b');
    responses.get(2)!.next('a 2');

    expect(pages.pages()).toEqual([]);
    expect(pages.loading()).toBe(false);
  });
});

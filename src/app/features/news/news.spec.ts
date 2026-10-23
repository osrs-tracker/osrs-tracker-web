import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { NewsArchivePage, StoredNewsItem } from '@osrs-tracker/models';
import { OsrsTrackerRepo } from '@app/common/api/osrs-tracker-repo';
import News from './news';

/** A post on `day`, at midnight UTC as the backfilled ones, or at `time` as the feed's */
const post = (day: string, time = '00:00'): StoredNewsItem => ({
  title: `Post of ${day}`,
  pubDate: new Date(`${day}T${time}:00Z`),
  category: 'Game Updates',
  link: `https://secure.runescape.com/m=news/${day}`,
});

// Guards where the catch-up stops paging: at the day picked, or at the oldest stored post
describe('News', () => {
  async function render(url: string, pages: Record<string, NewsArchivePage>): Promise<News> {
    return (await renderFixture(url, pages)).componentInstance;
  }

  async function renderFixture(url: string, pages: Record<string, NewsArchivePage>): Promise<ComponentFixture<News>> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'news', component: News }]),
        {
          provide: OsrsTrackerRepo,
          useValue: { getNewsArchive: (_: number, { before = '' } = {}) => of(pages[before]) },
        },
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(News);
    await fixture.whenStable();
    return fixture;
  }

  const titles = (news: News): string[] => news.months().flatMap(month => month.posts.map(p => p.title));

  afterEach(() => localStorage.clear());

  it('shows only the posts after the day picked, and stops paging once a page reaches it', async () => {
    const news = await render('/news?since=2026-09-01', {
      '': { posts: [post('2026-10-02'), post('2026-09-15')], next: 'b' },
      // The day picked itself isn't after it, also for a post later that day
      'b': { posts: [post('2026-09-05'), post('2026-09-01', '10:00')], next: 'c' },
    });

    expect(news.hasOlder()).toBe(true);
    news.showOlder();

    expect(titles(news)).toEqual(['Post of 2026-10-02', 'Post of 2026-09-15', 'Post of 2026-09-05']);
    expect(news.reachedSince()).toBe(true);
    expect(news.hasOlder()).toBe(false);
    expect(news.historyStart()).toBeNull();
  });

  it('says where the history starts when the day picked is before the oldest post', async () => {
    const news = await render('/news?since=2010-01-01', {
      '': { posts: [post('2026-10-02'), post('2013-02-22')], next: null },
    });

    expect(titles(news)).toHaveLength(2);
    expect(news.historyStart()).toEqual(new Date('2013-02-22T00:00:00Z'));
  });

  it('ignores today, which the calendar no longer offers', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const news = await render(`/news?since=${today}`, { '': { posts: [post('2026-10-02')], next: null } });

    expect(news.since()).toBeNull();
    expect(titles(news)).toEqual(['Post of 2026-10-02']);
  });

  it('ignores a day that does not exist', async () => {
    const news = await render('/news?since=2026-02-31', { '': { posts: [post('2026-10-02')], next: null } });

    expect(news.since()).toBeNull();
    expect(titles(news)).toEqual(['Post of 2026-10-02']);
  });

  it('offers every post when none came after the day picked, and moves focus to the day picker', async () => {
    const fixture = await renderFixture('/news?since=2026-10-02', { '': { posts: [post('2026-10-02')], next: null } });
    const host: HTMLElement = fixture.nativeElement;
    const button = [...host.querySelectorAll('button')].find(
      button => button.textContent!.trim() === 'Show every post',
    );

    button!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.since()).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('day-picker button'));
  });

  it("loads only the first rows' artwork eagerly", async () => {
    const days = ['2026-10-05', '2026-10-04', '2026-10-03', '2026-10-02'];
    const posts = days.map(day => ({ ...post(day), enclosure: { url: `/${day}.png`, type: 'image/png' } }));
    const fixture = await renderFixture('/news', { '': { posts, next: null } });
    const images = [...(fixture.nativeElement as HTMLElement).querySelectorAll('img')];

    expect(images.map(image => image.getAttribute('loading'))).toEqual(['eager', 'eager', 'eager', 'lazy']);
  });
});

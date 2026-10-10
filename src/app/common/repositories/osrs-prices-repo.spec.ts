import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SSR_TIMEOUT } from '@app/core/interceptors/ssr-timeout-interceptor';
import { config } from '@config/config';
import { OsrsPricesRepo } from './osrs-prices-repo';

describe('OsrsPricesRepo', () => {
  let repo: OsrsPricesRepo;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(OsrsPricesRepo);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  // The OSRS Wiki can stall for seconds, which held item pages up to 15 s during SSR
  it('lets the latest prices time out during SSR', () => {
    repo.getLatestPrices(4151, { fetchSingle: true }).subscribe();

    const req = httpTesting.expectOne(`${config.pricesBaseUrl}/api/v1/osrs/latest?id=4151`);
    expect(req.request.context.get(SSR_TIMEOUT)).toBe(true);
  });
});

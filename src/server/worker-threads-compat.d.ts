import type { Transferable } from 'worker_threads';

// @types/node 26 removed TransferListItem, which thread-stream 4.2.0 (the latest; pino's transport worker, via
// @osrs-tracker/logger) still references in its typings. Remove once thread-stream stops using it.
declare module 'worker_threads' {
  type TransferListItem = Transferable;
}

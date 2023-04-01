import { ChangeDetectorRef, ɵViewRef } from '@angular/core';

function findChangeDetectorRef(componentInstance: Record<string, unknown>): ChangeDetectorRef | undefined {
  return Object.values(componentInstance).find(
    (propertyValue: unknown) =>
      propertyValue && typeof propertyValue === 'object' && ɵViewRef.prototype.markForCheck.name in propertyValue!,
  ) as ChangeDetectorRef | undefined;
}

/**
 * Triggers a `ChangeDetectorRef.markForCheck()` when a value is assigned to the subject property.
 *
 * Requires `ChangeDetectorRef` to be injected in the constructor. When unused, make it `protected` or `unused` to prevent warnings or treeshaking.
 */
export const trackChanges: PropertyDecorator = (componentDefinition, propertyKey) => {
  // Unique keys where we can access our value and ChangeDetectorRef on the instance.
  const internalPropKey = `__trackChanges__${String(propertyKey)}__`;
  const internalCdRefKey = `__trackChanges__changeDetectorRef__`;

  Object.defineProperty(componentDefinition, propertyKey, {
    // No arrow function for the get/set, so that the "this" context is the component where we use this decorator.
    get() {
      return this[internalPropKey];
    },
    set(nextValue: unknown) {
      this[internalPropKey] = nextValue;

      // Find and set changeDetectorRef instance, or throw error if not found
      if (!this[internalCdRefKey]) {
        this[internalCdRefKey] = findChangeDetectorRef(this);
        if (!this[internalCdRefKey]) throw new Error('No ChangeDetectorRef injected in constructor.');
      }

      this[internalCdRefKey].markForCheck();
    },
  });
};

import { signal } from '@angular/core';

/**
 * Tracks which entity ids have a write request in flight, so the UI can lock the
 * matching card or form while it changes. Counts overlapping tasks per id, so an
 * id stays pending until the last of them settles.
 */
export class PendingIds {
  private readonly counts = signal<ReadonlyMap<string, number>>(new Map());

  has(id: string): boolean {
    return (this.counts().get(id) ?? 0) > 0;
  }

  async track<T>(id: string, task: () => Promise<T>): Promise<T> {
    this.adjust(id, 1);
    try {
      return await task();
    } finally {
      this.adjust(id, -1);
    }
  }

  private adjust(id: string, delta: number): void {
    this.counts.update((counts) => {
      const next = new Map(counts);
      const count = (next.get(id) ?? 0) + delta;
      if (count > 0) {
        next.set(id, count);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}

import { PendingIds } from './pending-ids';

describe('PendingIds', () => {
  it('marks an id as pending while its task runs and clears it after', async () => {
    const pending = new PendingIds();
    let resolveTask!: (value: string) => void;
    const result = pending.track(
      'a',
      () => new Promise<string>((resolve) => (resolveTask = resolve)),
    );

    expect(pending.has('a')).toBe(true);
    expect(pending.has('b')).toBe(false);

    resolveTask('done');
    await expect(result).resolves.toBe('done');
    expect(pending.has('a')).toBe(false);
  });

  it('clears the id when the task fails and rethrows the error', async () => {
    const pending = new PendingIds();
    const error = new Error('boom');

    await expect(pending.track('a', () => Promise.reject(error))).rejects.toBe(error);
    expect(pending.has('a')).toBe(false);
  });

  it('keeps the id pending until every overlapping task for it settles', async () => {
    const pending = new PendingIds();
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = pending.track(
      'a',
      () => new Promise<void>((resolve) => (resolveFirst = resolve)),
    );
    const second = pending.track(
      'a',
      () => new Promise<void>((resolve) => (resolveSecond = resolve)),
    );

    resolveFirst();
    await first;
    expect(pending.has('a')).toBe(true);

    resolveSecond();
    await second;
    expect(pending.has('a')).toBe(false);
  });
});

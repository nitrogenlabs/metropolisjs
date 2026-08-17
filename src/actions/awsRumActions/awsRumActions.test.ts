import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const rumMutationMock = vi.fn();

vi.mock('../../utils/api.js', () => ({
  rumMutation: rumMutationMock
}));

const {AWS_RUM_CONSTANTS, createAwsRumActions} = await import('./awsRumActions.js');

const createFlux = () => ({
  dispatch: vi.fn(async (payload) => payload)
});

describe('awsRumActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T12:00:00.000Z'));
    rumMutationMock.mockResolvedValue({rum: {track: {accepted: 1, appId: 'gotham'}}});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('deduplicates, sanitizes, and debounces events into one Reaktor batch', async () => {
    const flux = createFlux();
    const awsRum = createAwsRumActions(flux as any, {
      appId: 'gotham',
      debounceMs: 100,
      dedupeMs: 1000,
      throttleMs: 500
    });

    awsRum.track({
      name: 'page_view',
      path: '/docs?token=private',
      properties: {
        email: 'person@example.com',
        note: 'Contact person@example.com',
        score: Number.NaN,
        title: 'Docs'
      },
      type: 'page_view'
    });
    awsRum.track({
      name: 'page_view',
      path: '/docs?token=private',
      properties: {
        email: 'person@example.com',
        note: 'Contact person@example.com',
        score: Number.NaN,
        title: 'Docs'
      },
      type: 'page_view'
    });
    awsRum.track({name: 'navbar_docs', path: '/docs', type: 'click'});

    await vi.advanceTimersByTimeAsync(100);

    expect(rumMutationMock).toHaveBeenCalledTimes(1);
    const variables = rumMutationMock.mock.calls[0][3];
    const events = variables.batch.value.events;

    expect(variables.batch.value.appId).toBe('gotham');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({name: 'page_view', path: '/docs', sequence: 1, type: 'page_view'});
    expect(events[0].properties).toEqual({title: 'Docs'});
    expect(events[1]).toMatchObject({name: 'navbar_docs', path: '/docs', sequence: 2, type: 'click'});
    expect(events[0].journeyId).toBe(events[1].journeyId);
    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({type: AWS_RUM_CONSTANTS.TRACK_SUCCESS}));
  });

  it('throttles later batches and allows a duplicate after the dedupe window', async () => {
    const flux = createFlux();
    const awsRum = createAwsRumActions(flux as any, {
      appId: 'gotham',
      debounceMs: 100,
      dedupeMs: 200,
      throttleMs: 1000
    });
    const event = {name: 'cta', type: 'click'} as const;

    awsRum.track(event);
    await vi.advanceTimersByTimeAsync(100);
    expect(rumMutationMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(150);
    awsRum.track(event);
    await vi.advanceTimersByTimeAsync(849);
    expect(rumMutationMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(rumMutationMock).toHaveBeenCalledTimes(2);
  });

  it('restores a failed batch for an explicit retry', async () => {
    const flux = createFlux();
    const awsRum = createAwsRumActions(flux as any, {appId: 'gotham', debounceMs: 0, throttleMs: 0});
    const error = new Error('offline');
    rumMutationMock.mockRejectedValueOnce(error).mockResolvedValueOnce({});

    awsRum.track({name: 'page_view', path: '/home', type: 'page_view'});
    await vi.runAllTimersAsync();

    expect(flux.dispatch).toHaveBeenCalledWith(expect.objectContaining({error, type: AWS_RUM_CONSTANTS.TRACK_ERROR}));

    await awsRum.flush();
    expect(rumMutationMock).toHaveBeenCalledTimes(2);
  });

  it('is disabled without an app id and flushes pending work when destroyed', async () => {
    const flux = createFlux();
    const disabledRum = createAwsRumActions(flux as any);
    disabledRum.track({name: 'ignored', type: 'click'});
    await disabledRum.flush();
    expect(rumMutationMock).not.toHaveBeenCalled();

    const awsRum = createAwsRumActions(flux as any, {appId: 'gotham', debounceMs: 5000});
    awsRum.track({name: 'saved', type: 'click'});
    await awsRum.destroy();
    expect(rumMutationMock).toHaveBeenCalledTimes(1);
  });

  it('splits large queues into server-safe batches', async () => {
    const flux = createFlux();
    const awsRum = createAwsRumActions(flux as any, {
      appId: 'gotham',
      debounceMs: 5000,
      dedupeMs: 0
    });

    for(let index = 0; index < 51; index += 1) {
      awsRum.track({name: `click-${index}`, type: 'click'});
    }

    await awsRum.flush();

    expect(rumMutationMock).toHaveBeenCalledTimes(2);
    expect(rumMutationMock.mock.calls[0][3].batch.value.events).toHaveLength(50);
    expect(rumMutationMock.mock.calls[1][3].batch.value.events).toHaveLength(1);
  });

  it('honors browser privacy signals unless explicitly disabled', async () => {
    const flux = createFlux();
    vi.stubGlobal('navigator', {doNotTrack: '1', globalPrivacyControl: true});

    const privateRum = createAwsRumActions(flux as any, {
      appId: 'gotham',
      debounceMs: 0,
      throttleMs: 0
    });
    privateRum.track({name: 'private', type: 'click'});
    await vi.runAllTimersAsync();
    expect(rumMutationMock).not.toHaveBeenCalled();

    const requiredRum = createAwsRumActions(flux as any, {
      appId: 'gotham',
      debounceMs: 0,
      respectPrivacySignals: false,
      throttleMs: 0
    });
    requiredRum.track({name: 'required', type: 'click'});
    await vi.runAllTimersAsync();
    expect(rumMutationMock).toHaveBeenCalledTimes(1);
  });
});

import {FluxFramework} from '@nlabs/arkhamjs';
import {describe, expect, it, vi} from 'vitest';

import {bindNativeNotificationIngress, routeNativeNotificationIngress} from './ingress.js';

describe('native notification ingress lifecycle', () => {
  it('preserves a replacement handler when an older binding unsubscribes', async () => {
    const flux = new FluxFramework();
    const first = vi.fn(async () => true);
    const second = vi.fn(async () => true);
    const removeFirst = bindNativeNotificationIngress(flux, first);
    const removeSecond = bindNativeNotificationIngress(flux, second);
    removeFirst();

    expect(routeNativeNotificationIngress(flux, {notificationId: 'replacement'})).toBe(true);

    await Promise.resolve();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({notificationId: 'replacement'});

    removeSecond();

    expect(routeNativeNotificationIngress(flux, {})).toBe(false);
  });

  it('absorbs rejected ingress promises without leaking an unhandled rejection', async () => {
    const flux = new FluxFramework();
    const rejected = vi.fn(async () => {
      throw new Error('ingress rejected');
    });
    const remove = bindNativeNotificationIngress(flux, rejected);

    expect(routeNativeNotificationIngress(flux, {})).toBe(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(rejected).toHaveBeenCalledOnce();

    remove();
  });
});

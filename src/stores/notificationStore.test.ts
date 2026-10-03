import {defaultValues, NOTIFICATION_CONSTANTS, notificationStore} from './notificationStore.js';

describe('notificationStore', () => {
  it('rejects late native writes from a previous binding while ordinary clearing keeps the current binding', () => {
    const current = notificationStore('NOTIFICATION_SET_NATIVE_BINDING', {nativeBindingKey: 'new'} as any);
    const stale = notificationStore(NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS, {
      nativeBindingKey: 'old', notification: {notificationId: 'private-old'}
    } as any, current);

    expect(stale.list).toEqual([]);

    const cleared = notificationStore(NOTIFICATION_CONSTANTS.CLEAR_ITEMS, {}, current);

    expect(notificationStore(NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS, {
      nativeBindingKey: 'new', notification: {notificationId: 'current'}
    } as any, cleared).list).toEqual([{notificationId: 'current'}]);
  });

  it('returns the same state by default', () => {
    expect(notificationStore('', {}, defaultValues)).toBe(defaultValues);
  });

  it('adds a notification to the front of the list', () => {
    const notification = {content: 'hello', notificationId: 'notification-1'};

    expect(
      notificationStore(
        NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS,
        {notification},
        defaultValues
      )
    ).toEqual({
      list: [notification]
    });
  });

  it('deduplicates notifications by notificationId', () => {
    const currentState = {
      list: [{content: 'hello', notificationId: 'notification-1'}]
    };

    expect(
      notificationStore(
        NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS,
        {notification: {content: 'updated', notificationId: 'notification-1', read: true}},
        currentState
      )
    ).toEqual({
      list: [{content: 'updated', notificationId: 'notification-1', read: true}]
    });
  });

  it('clears notifications', () => {
    expect(
      notificationStore(
        NOTIFICATION_CONSTANTS.CLEAR_ITEMS,
        {},
        {list: [{content: 'hello', notificationId: 'notification-1'}]}
      )
    ).toEqual(defaultValues);
  });
});

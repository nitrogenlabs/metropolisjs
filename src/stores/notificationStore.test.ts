import {defaultValues, NOTIFICATION_CONSTANTS, notificationStore} from './notificationStore';

describe('notificationStore', () => {
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

/**
 * Copyright (c) 2019-Present, Nitrogen Labs, Inc.
 * Copyrights licensed under the MIT License. See the accompanying LICENSE file for terms.
 */

export const NOTIFICATION_CONSTANTS = {
  ADD_ITEM_SUCCESS: 'NOTIFICATION_ADD_ITEM_SUCCESS',
  CLEAR_ITEMS: 'NOTIFICATION_CLEAR_ITEMS'
} as const;

export type NotificationType = Record<string, unknown> & {
  readonly added?: number;
  readonly content?: string;
  readonly from?: string;
  readonly modified?: number;
  readonly notificationId?: string;
  readonly read?: boolean;
  readonly to?: string;
  readonly type?: string;
};

export interface NotificationState {
  readonly list: NotificationType[];
}

export const defaultValues: NotificationState = {
  list: []
};

export const notificationStore = (
  type: string,
  data: {
    notification?: NotificationType;
  },
  state = defaultValues
): NotificationState => {
  switch(type) {
    case NOTIFICATION_CONSTANTS.ADD_ITEM_SUCCESS: {
      const notification = data?.notification || {};
      const notificationId = String(notification?.notificationId || '');

      if(!Object.keys(notification).length) {
        return state;
      }

      if(notificationId) {
        const nextList = state.list.some((item) => String(item?.notificationId || '') === notificationId)
          ? state.list.map((item) => (String(item?.notificationId || '') === notificationId ? {...item, ...notification} : item))
          : [notification, ...state.list];

        return {list: nextList};
      }

      return {list: [notification, ...state.list]};
    }

    case NOTIFICATION_CONSTANTS.CLEAR_ITEMS: {
      return defaultValues;
    }

    default: {
      return state;
    }
  }
};

export const notifications = {
  action: notificationStore,
  initialState: defaultValues,
  name: 'notification'
};

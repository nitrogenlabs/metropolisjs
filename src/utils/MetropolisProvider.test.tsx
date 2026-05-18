// @vitest-environment jsdom
import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {MetropolisContext, MetropolisProvider} from './MetropolisProvider.js';

describe('MetropolisProvider', () => {
  it('renders provider defaults and supplied context values', () => {
    const updateMessage = vi.fn();
    const updateNotification = vi.fn();
    let contextValue: any;

    render(
      <MetropolisProvider
        isAuth={() => false}
        messages={[{messageId: 'message-1'} as any]}
        notifications={[{notificationId: 'notification-1'}]}
        session={{token: 'token-1'} as any}
        updateMessage={updateMessage}
        updateNotification={updateNotification}>
        <MetropolisContext.Consumer>
          {(value) => {
            contextValue = value;
            return <div>child</div>;
          }}
        </MetropolisContext.Consumer>
      </MetropolisProvider>
    );

    expect(contextValue.isAuth()).toBe(false);
    expect(contextValue.messages).toHaveLength(1);
    expect(contextValue.notifications).toHaveLength(1);
    expect(contextValue.session.token).toBe('token-1');
  });

  it('provides default context values without props', () => {
    let contextValue: any;

    render(
      <MetropolisProvider updateMessage={(message) => message} updateNotification={(notification) => notification}>
        <MetropolisContext.Consumer>
          {(value) => {
            contextValue = value;
            return <div>child</div>;
          }}
        </MetropolisContext.Consumer>
      </MetropolisProvider>
    );

    expect(contextValue.isAuth()).toBe(true);
    expect(contextValue.messages).toEqual([]);
    expect(contextValue.notifications).toEqual([]);
    expect(contextValue.session).toEqual({});
  });

  it('exposes the standalone default context', () => {
    let contextValue: any;

    render(
      <MetropolisContext.Consumer>
        {(value) => {
          contextValue = value;
          return <div>child</div>;
        }}
      </MetropolisContext.Consumer>
    );

    expect(contextValue.isAuth()).toBe(true);
    expect(contextValue.updateMessage({messageId: 'message-1'} as any)).toEqual({messageId: 'message-1'});
    expect(contextValue.updateNotification({notificationId: 'notification-1'} as any)).toEqual({notificationId: 'notification-1'});
  });
});

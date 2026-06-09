/**
 * tests/integration/batterySaverReconnect.test.ts
 * T041 (integration): In battery-saver mode, reconnection interval increases to 15s.
 */

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => () => {}),
}));

jest.mock('expo-battery', () => ({
  isLowPowerModeEnabledAsync: jest.fn(async () => false),
  addLowPowerModeListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
}));

import { ConnectivityManager } from '../../../services/resilience/connectivityManager';
import * as Battery from 'expo-battery';

describe('BatterySaver reconnect interval', () => {
  it('returns 1000ms reconnect interval when battery saver is OFF', async () => {
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(false);
    const m = new ConnectivityManager();
    await m.start();
    expect(m.getReconnectionInterval()).toBe(1000);
    m.stop();
  });

  it('returns 15000ms reconnect interval when battery saver is ON', async () => {
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(true);
    const m = new ConnectivityManager();
    await m.start();
    expect(m.getReconnectionInterval()).toBe(15_000);
    m.stop();
  });

  it('reconnect interval updates immediately when battery saver toggles on', async () => {
    let batteryCb: ((e: { lowPowerMode: boolean }) => void) | null = null;
    (Battery.addLowPowerModeListener as jest.Mock).mockImplementation((cb) => {
      batteryCb = cb;
      return { remove: jest.fn() };
    });
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(false);

    const m = new ConnectivityManager();
    await m.start();
    expect(m.getReconnectionInterval()).toBe(1000);

    batteryCb?.({ lowPowerMode: true });
    expect(m.getReconnectionInterval()).toBe(15_000);

    m.stop();
  });

  it('reconnect interval reverts when battery saver toggles off', async () => {
    let batteryCb: ((e: { lowPowerMode: boolean }) => void) | null = null;
    (Battery.addLowPowerModeListener as jest.Mock).mockImplementation((cb) => {
      batteryCb = cb;
      return { remove: jest.fn() };
    });
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(true);

    const m = new ConnectivityManager();
    await m.start();
    expect(m.getReconnectionInterval()).toBe(15_000);

    batteryCb?.({ lowPowerMode: false });
    expect(m.getReconnectionInterval()).toBe(1000);

    m.stop();
  });

  it('subscribe emits current offline state immediately', () => {
    const m = new ConnectivityManager();
    // Manually set state to offline via private access (for testing)
    (m as any).currentState = 'offline';

    const cb = jest.fn();
    m.subscribe(cb);

    expect(cb).toHaveBeenCalledWith('offline');
    m.stop();
  });
});

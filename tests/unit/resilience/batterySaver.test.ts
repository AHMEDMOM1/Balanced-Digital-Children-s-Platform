/**
 * tests/unit/resilience/batterySaver.test.ts
 * T041: Low-power mode detection via ConnectivityManager.
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

let manager: ConnectivityManager;

beforeEach(async () => {
  manager = new ConnectivityManager();
  await manager.start();
});

afterEach(() => {
  manager.stop();
  jest.clearAllMocks();
});

describe('BatterySaver detection', () => {
  it('isBatterySaver() returns false when low-power mode is off', async () => {
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(false);
    const m2 = new ConnectivityManager();
    await m2.start();
    expect(m2.isBatterySaver()).toBe(false);
    m2.stop();
  });

  it('isBatterySaver() returns true when low-power mode is on', async () => {
    (Battery.isLowPowerModeEnabledAsync as jest.Mock).mockResolvedValue(true);
    const m2 = new ConnectivityManager();
    await m2.start();
    expect(m2.isBatterySaver()).toBe(true);
    m2.stop();
  });

  it('fires batterySaver listener when low-power mode changes', async () => {
    let listenerCallback: ((event: { lowPowerMode: boolean }) => void) | null = null;
    (Battery.addLowPowerModeListener as jest.Mock).mockImplementation((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    const m3 = new ConnectivityManager();
    await m3.start();

    const batteryCb = jest.fn();
    m3.onBatterySaverChange(batteryCb);

    listenerCallback?.({ lowPowerMode: true });
    expect(batteryCb).toHaveBeenCalledWith(true);

    listenerCallback?.({ lowPowerMode: false });
    expect(batteryCb).toHaveBeenCalledWith(false);

    m3.stop();
  });

  it('unsubscribing onBatterySaverChange stops callbacks', async () => {
    let listenerCallback: ((event: { lowPowerMode: boolean }) => void) | null = null;
    (Battery.addLowPowerModeListener as jest.Mock).mockImplementation((cb) => {
      listenerCallback = cb;
      return { remove: jest.fn() };
    });

    const m4 = new ConnectivityManager();
    await m4.start();

    const batteryCb = jest.fn();
    const unsub = m4.onBatterySaverChange(batteryCb);
    unsub();

    listenerCallback?.({ lowPowerMode: true });
    expect(batteryCb).not.toHaveBeenCalled();

    m4.stop();
  });
});

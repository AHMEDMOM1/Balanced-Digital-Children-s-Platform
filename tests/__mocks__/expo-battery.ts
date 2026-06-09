export const getBatteryLevelAsync = jest.fn().mockResolvedValue(0.8);
export const getBatteryStateAsync = jest.fn().mockResolvedValue(3);
export const BatteryState = { UNPLUGGED: 1, CHARGING: 2, FULL: 3, UNKNOWN: 0 };
export const addBatteryLevelListener = jest.fn(() => ({ remove: jest.fn() }));
export const addBatteryStateListener = jest.fn(() => ({ remove: jest.fn() }));

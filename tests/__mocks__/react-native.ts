export const Platform = { OS: 'ios', select: jest.fn((obj: any) => obj.ios ?? obj.default) };
export const I18nManager = { isRTL: false, forceRTL: jest.fn(), allowRTL: jest.fn() };
export const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};
export const Alert = { alert: jest.fn() };
export const Animated = {
  Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn() })),
  timing: jest.fn(() => ({ start: jest.fn() })),
  spring: jest.fn(() => ({ start: jest.fn() })),
  View: 'Animated.View',
};
export const StyleSheet = { create: (styles: any) => styles, flatten: (style: any) => style };
export const View = 'View';
export const Text = 'Text';
export const TouchableOpacity = 'TouchableOpacity';
export const ScrollView = 'ScrollView';
export const FlatList = 'FlatList';
export const ActivityIndicator = 'ActivityIndicator';
export const Image = 'Image';
export const Pressable = 'Pressable';

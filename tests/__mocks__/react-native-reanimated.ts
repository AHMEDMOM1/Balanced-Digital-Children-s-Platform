const Animated: Record<string, string> = {
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Image: 'Image',
};

export default Animated;

export const FadeInDown = {
  duration: jest.fn(() => FadeInDown as any),
  damping: jest.fn(() => FadeInDown as any),
  delay: jest.fn(() => FadeInDown as any),
};

export const BounceIn = {
  duration: jest.fn(() => BounceIn as any),
  delay: jest.fn(() => BounceIn as any),
};

export const FadeIn = {
  duration: jest.fn(() => FadeIn as any),
  delay: jest.fn(() => FadeIn as any),
};

export const ZoomIn = {
  duration: jest.fn(() => ZoomIn as any),
  delay: jest.fn(() => ZoomIn as any),
};

export const useAnimatedStyle = jest.fn(() => ({}));
export const useSharedValue = jest.fn((v: any) => ({ value: v }));
export const withTiming = jest.fn((v: any) => v);
export const withSpring = jest.fn((v: any) => v);
export const runOnJS = jest.fn((fn: any) => fn);
export const createAnimatedComponent = jest.fn((c: any) => c);

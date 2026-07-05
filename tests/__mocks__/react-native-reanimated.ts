const Animated: Record<string, string> = {
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Image: 'Image',
};

export default Animated;

export const FadeInDown: any = {
  duration: jest.fn(() => FadeInDown),
  damping: jest.fn(() => FadeInDown),
  delay: jest.fn(() => FadeInDown),
};

export const BounceIn: any = {
  duration: jest.fn(() => BounceIn),
  delay: jest.fn(() => BounceIn),
};

export const FadeIn: any = {
  duration: jest.fn(() => FadeIn),
  delay: jest.fn(() => FadeIn),
};

export const FadeInRight: any = {
  duration: jest.fn(() => FadeInRight),
  delay: jest.fn(() => FadeInRight),
};

export const FadeOutLeft: any = {
  duration: jest.fn(() => FadeOutLeft),
  delay: jest.fn(() => FadeOutLeft),
};

export const ZoomIn: any = {
  duration: jest.fn(() => ZoomIn),
  delay: jest.fn(() => ZoomIn),
};

export const useAnimatedStyle = jest.fn(() => ({}));
export const useSharedValue = jest.fn((v: any) => ({ value: v }));
export const withTiming = jest.fn((v: any) => v);
export const withSpring = jest.fn((v: any) => v);
export const runOnJS = jest.fn((fn: any) => fn);
export const createAnimatedComponent = jest.fn((c: any) => c);

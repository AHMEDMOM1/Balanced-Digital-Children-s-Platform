export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
}));
export const useLocalSearchParams = jest.fn(() => ({}));
export const useSegments = jest.fn(() => []);
export const usePathname = jest.fn(() => '/');
export const Link = 'Link';
export const Stack = { Screen: 'Stack.Screen' };
export const Tabs = { Screen: 'Tabs.Screen' };
export const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
};

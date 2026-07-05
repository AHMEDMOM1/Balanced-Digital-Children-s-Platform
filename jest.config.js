module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        // Mock native modules not available in Node
        '^expo-sqlite$': '<rootDir>/tests/__mocks__/expo-sqlite.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/tests/__mocks__/async-storage.ts',
        '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
        '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
        '^expo-battery$': '<rootDir>/tests/__mocks__/expo-battery.ts',
        '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.ts',
        '^react-native-reanimated$': '<rootDir>/tests/__mocks__/react-native-reanimated.ts',
        '^react-native-safe-area-context$': '<rootDir>/tests/__mocks__/react-native-safe-area-context.ts',
        '^@expo/vector-icons$': '<rootDir>/tests/__mocks__/expo-vector-icons.ts',
        '^@expo/vector-icons/(.*)$': '<rootDir>/tests/__mocks__/expo-vector-icons.ts',
        '^expo-crypto$': '<rootDir>/tests/__mocks__/expo-crypto.ts',
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            jsx: 'react',
            esModuleInterop: true,
          },
          diagnostics: false,
        },
      },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      setupFiles: ['<rootDir>/tests/setup-integration-env.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^expo-sqlite$': '<rootDir>/tests/__mocks__/expo-sqlite.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/tests/__mocks__/async-storage.ts',
        '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
        '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
        '^expo-battery$': '<rootDir>/tests/__mocks__/expo-battery.ts',
        '^expo-file-system$': '<rootDir>/tests/__mocks__/expo-file-system.ts',
      },
      globals: {
        'ts-jest': {
          tsconfig: {
            jsx: 'react-native',
            esModuleInterop: true,
          },
        },
      },
    },
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
};

module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        // Mock native modules not available in Node
        '^expo-sqlite$': '<rootDir>/tests/__mocks__/expo-sqlite.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/tests/__mocks__/async-storage.ts',
        '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
        '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
        '^expo-battery$': '<rootDir>/tests/__mocks__/expo-battery.ts',
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
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^expo-sqlite$': '<rootDir>/tests/__mocks__/expo-sqlite.ts',
        '^@react-native-async-storage/async-storage$': '<rootDir>/tests/__mocks__/async-storage.ts',
        '^react-native$': '<rootDir>/tests/__mocks__/react-native.ts',
        '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.ts',
        '^expo-battery$': '<rootDir>/tests/__mocks__/expo-battery.ts',
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

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@supabase/supabase-js',
            message: 'Direct Supabase imports are forbidden. Use services/api instead.',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ['services/api/**/*.ts'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules/', '.expo/'],
};

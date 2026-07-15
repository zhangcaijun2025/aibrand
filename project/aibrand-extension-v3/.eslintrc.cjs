/**
 * ESLint 配置 — AiBrand Extension v3
 *
 * 基于 @typescript-eslint v7 + eslint 8
 * 聚焦类型安全与代码质量，不含风格类规则（交给 Prettier/EditorConfig）
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    browser: true,
    es2022: true,
    webextensions: true,
    node: true,
  },
  settings: {
    react: { version: '18' },
  },
  rules: {
    // ── 类型安全 ──
    '@typescript-eslint/no-explicit-any': 'error',         // 禁止 any，强制类型加固
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',       // _ 前缀参数豁免
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],

    // ── 代码质量 ──
    'no-console': 'off', // 扩展场景必需的日志手段
    'no-debugger': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],

    // ── 放宽（与项目现状对齐） ──
    '@typescript-eslint/no-empty-function': 'off',
  },
  ignorePatterns: [
    'dist/',
    '.wxt/',
    '.output/',
    'node_modules/',
    '*.config.ts',
    '*.config.js',
    '*.config.cjs',
  ],
};

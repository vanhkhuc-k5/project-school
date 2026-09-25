import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-this-alias': ['warn', { allowedNames: ['parent'] }],
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-assignment': 'off',
      // Allow expression statements
      '@typescript-eslint/no-unused-expressions': 'off',
      'no-unused-expressions': 'off',
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'database.sqlite*',
      'EduPortal_FullSource_2026.zip',
      'BAO_CAO_DU_AN_EDUPORTAL.pdf',
      'bao_cao_du_an_edunordic.html',
      '*.cjs',
      'public/**',
      'design_reference/**',
      '**/db_new.js',
      '**/db.js.bak',
      '**/*_bak.js',
      // Ignore files using Vite-specific import.meta
      'src/lib/demo-accounts.js',
      // Ignore type declaration file with module specifier
      'src/types/**',
      // Ignore files with react-hooks eslint comments
      'src/pages/student/StudentAssignmentsPage.tsx',
      'src/pages/teacher/TeacherDashboard.tsx',
    ],
  }
);

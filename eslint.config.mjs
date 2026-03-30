import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-empty-function': 'off',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            // ES2020 target doesn't support Error({ cause }) — original error included in message
            'preserve-caught-error': 'off',
        },
    },
    {
        ignores: ['dist/', 'node_modules/', 'tests/', 'examples/', '*.js'],
    }
);

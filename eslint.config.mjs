/**
 * ESLint flat config. It keeps the rules Create React App's `react-app` preset
 * applied (eslint-config-react-app), so moving off CRA doesn't change what
 * lint reports; only its Flow rules and the Jest/Testing Library test rules
 * are gone.
 *
 * eslint-plugin-react, -jsx-a11y and -import don't declare ESLint 10 yet
 * (package.json overrides their peer), but their rules run on it. The React
 * version is set explicitly because the plugin's `detect` calls a context
 * API that ESLint 10 removed; keep it in step with package.json.
 */
import globals from 'globals';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import confusingBrowserGlobals from 'confusing-browser-globals';

const codeSplittingMessage = 'Please use import() instead.';

const reactAppRules = {
  'array-callback-return': 'warn',
  'default-case': ['warn', { commentPattern: '^no default$' }],
  'dot-location': ['warn', 'property'],
  'eqeqeq': ['warn', 'smart'],
  'new-parens': 'warn',
  'no-array-constructor': 'warn',
  'no-caller': 'warn',
  'no-cond-assign': ['warn', 'except-parens'],
  'no-const-assign': 'warn',
  'no-control-regex': 'warn',
  'no-delete-var': 'warn',
  'no-dupe-args': 'warn',
  'no-dupe-class-members': 'warn',
  'no-dupe-keys': 'warn',
  'no-duplicate-case': 'warn',
  'no-empty-character-class': 'warn',
  'no-empty-pattern': 'warn',
  'no-eval': 'warn',
  'no-ex-assign': 'warn',
  'no-extend-native': 'warn',
  'no-extra-bind': 'warn',
  'no-extra-label': 'warn',
  'no-fallthrough': 'warn',
  'no-func-assign': 'warn',
  'no-implied-eval': 'warn',
  'no-invalid-regexp': 'warn',
  'no-iterator': 'warn',
  'no-label-var': 'warn',
  'no-labels': ['warn', { allowLoop: true, allowSwitch: false }],
  'no-lone-blocks': 'warn',
  'no-loop-func': 'warn',
  'no-mixed-operators': [
    'warn',
    {
      groups: [
        ['&', '|', '^', '~', '<<', '>>', '>>>'],
        ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
        ['&&', '||'],
        ['in', 'instanceof'],
      ],
      allowSamePrecedence: false,
    },
  ],
  'no-multi-str': 'warn',
  'no-global-assign': 'warn',
  'no-unsafe-negation': 'warn',
  'no-new-func': 'warn',
  'no-object-constructor': 'warn',
  'no-new-native-nonconstructor': 'warn',
  'no-new-wrappers': 'warn',
  'no-obj-calls': 'warn',
  'no-octal': 'warn',
  'no-octal-escape': 'warn',
  'no-redeclare': 'warn',
  'no-regex-spaces': 'warn',
  'no-restricted-syntax': ['warn', 'WithStatement'],
  'no-script-url': 'warn',
  'no-self-assign': 'warn',
  'no-self-compare': 'warn',
  'no-sequences': 'warn',
  'no-shadow-restricted-names': 'warn',
  'no-sparse-arrays': 'warn',
  'no-template-curly-in-string': 'warn',
  'no-this-before-super': 'warn',
  'no-throw-literal': 'warn',
  'no-undef': 'error',
  'no-restricted-globals': ['error', ...confusingBrowserGlobals],
  'no-unreachable': 'warn',
  'no-unused-expressions': [
    'error',
    { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
  ],
  'no-unused-labels': 'warn',
  'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
  'no-use-before-define': [
    'warn',
    { functions: false, classes: false, variables: false },
  ],
  'no-useless-computed-key': 'warn',
  'no-useless-concat': 'warn',
  'no-useless-constructor': 'warn',
  'no-useless-escape': 'warn',
  'no-useless-rename': [
    'warn',
    { ignoreDestructuring: false, ignoreImport: false, ignoreExport: false },
  ],
  'no-with': 'warn',
  'no-whitespace-before-property': 'warn',
  'require-yield': 'warn',
  'rest-spread-spacing': ['warn', 'never'],
  'strict': ['warn', 'never'],
  'unicode-bom': ['warn', 'never'],
  'use-isnan': 'warn',
  'valid-typeof': 'warn',
  'no-restricted-properties': [
    'error',
    { object: 'require', property: 'ensure', message: codeSplittingMessage },
    { object: 'System', property: 'import', message: codeSplittingMessage },
  ],
  'getter-return': 'warn',

  'import/first': 'error',
  'import/no-amd': 'error',
  'import/no-anonymous-default-export': 'warn',
  'import/no-webpack-loader-syntax': 'error',

  'react/forbid-foreign-prop-types': ['warn', { allowInPropTypes: true }],
  'react/jsx-no-comment-textnodes': 'warn',
  'react/jsx-no-duplicate-props': 'warn',
  'react/jsx-no-target-blank': 'warn',
  'react/jsx-no-undef': 'error',
  'react/jsx-pascal-case': ['warn', { allowAllCaps: true, ignore: [] }],
  'react/no-danger-with-children': 'warn',
  'react/no-direct-mutation-state': 'warn',
  'react/no-is-mounted': 'warn',
  'react/no-typos': 'error',
  'react/require-render-return': 'error',
  'react/style-prop-object': 'warn',
  'react/jsx-uses-vars': 'warn',
  'react/jsx-uses-react': 'warn',

  'jsx-a11y/alt-text': 'warn',
  'jsx-a11y/anchor-has-content': 'warn',
  'jsx-a11y/anchor-is-valid': ['warn', { aspects: ['noHref', 'invalidHref'] }],
  'jsx-a11y/aria-activedescendant-has-tabindex': 'warn',
  'jsx-a11y/aria-props': 'warn',
  'jsx-a11y/aria-proptypes': 'warn',
  'jsx-a11y/aria-role': ['warn', { ignoreNonDOM: true }],
  'jsx-a11y/aria-unsupported-elements': 'warn',
  'jsx-a11y/heading-has-content': 'warn',
  'jsx-a11y/iframe-has-title': 'warn',
  'jsx-a11y/img-redundant-alt': 'warn',
  'jsx-a11y/no-access-key': 'warn',
  'jsx-a11y/no-distracting-elements': 'warn',
  'jsx-a11y/no-redundant-roles': 'warn',
  'jsx-a11y/role-has-required-aria-props': 'warn',
  'jsx-a11y/role-supports-aria-props': 'warn',
  'jsx-a11y/scope': 'warn',

  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
};

const typescriptRules = {
  'default-case': 'off',
  'no-dupe-class-members': 'off',
  'no-undef': 'off',
  '@typescript-eslint/consistent-type-assertions': 'warn',
  'no-array-constructor': 'off',
  '@typescript-eslint/no-array-constructor': 'warn',
  'no-redeclare': 'off',
  '@typescript-eslint/no-redeclare': 'warn',
  'no-use-before-define': 'off',
  '@typescript-eslint/no-use-before-define': [
    'warn',
    { functions: false, classes: false, variables: false, typedefs: false },
  ],
  'no-unused-expressions': 'off',
  '@typescript-eslint/no-unused-expressions': [
    'error',
    { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
  ],
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    { args: 'none', ignoreRestSiblings: true },
  ],
  'no-useless-constructor': 'off',
  '@typescript-eslint/no-useless-constructor': 'warn',
};

const config = [
  { ignores: ['build/', 'coverage/', 'node_modules/'] },
  {
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'import': importPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.commonjs,
        ...globals.vitest,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    settings: { react: { version: '18.3' } },
    rules: reactAppRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    rules: typescriptRules,
  },
  {
    // Browser-console snippets that load ethers from a CDN first.
    files: ['recoverAddress.js', 'recovery.js'],
    languageOptions: { globals: { ethers: 'readonly' } },
  },
];

export default config;

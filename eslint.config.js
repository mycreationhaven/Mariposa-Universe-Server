import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config({ignores:['dist','node_modules','drizzle']},js.configs.recommended,...tseslint.configs.recommended,{languageOptions:{globals:{EventTarget:'readonly',Event:'readonly',CustomEvent:'readonly',performance:'readonly',crypto:'readonly',console:'readonly',runOnStartup:'readonly'}},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}]}});

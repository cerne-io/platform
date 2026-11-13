import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
// @ts-expect-error - eslint.config.js lacks type declarations
import config from '../../../eslint.config.js';

describe('no-restricted-syntax for getUser()', () => {
  const testConfig = [{ rules: config.find((c: { rules?: Record<string, unknown> }) => c.rules && c.rules['no-restricted-syntax'])?.rules }];

  it('should flag supabase.auth.getUser()', () => {
    const linter = new Linter({ configType: 'flat' });
    const result = linter.verify('async function test() { await supabase.auth.getUser(); }', testConfig);
    const error = result.find(m => m.ruleId === 'no-restricted-syntax');
    expect(error).toBeDefined();
    expect(error?.message).toMatch(/Use useAuth()/);
  });

  it('should not flag useAuth()', () => {
    const linter = new Linter({ configType: 'flat' });
    const result = linter.verify('function test() { const { user } = useAuth(); }', testConfig);
    const error = result.find(m => m.ruleId === 'no-restricted-syntax');
    expect(error).toBeUndefined();
  });

  it('should not flag supabase.auth.getSession()', () => {
    const linter = new Linter({ configType: 'flat' });
    const result = linter.verify('async function test() { await supabase.auth.getSession(); }', testConfig);
    const error = result.find(m => m.ruleId === 'no-restricted-syntax');
    expect(error).toBeUndefined();
  });
});

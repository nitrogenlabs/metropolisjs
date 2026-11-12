// @vitest-environment node
import {afterEach, beforeEach, describe, expect, it} from '@nlabs/lex/test-vitest';
import {spawnSync} from 'node:child_process';
import {chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';

const hooks = resolve(import.meta.dirname, '../.githooks');
const zero = '0'.repeat(40);
const code = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts'];
let directory: string;
let repository: string;
let binaries: string;
let log: string;
const environment = () => ({
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null'
});
const git = (...args: string[]): string => {
  const result = spawnSync('git', args, {cwd: repository, encoding: 'utf8', env: environment()});
  if(result.status !== 0) {
    throw new Error(`Fixture git failed with status ${result.status}`);
  }
  return result.stdout.trim();
};
const write = (name: string, value = 'fixture'): void => {
  mkdirSync(dirname(join(repository, name)), {recursive: true});
  writeFileSync(join(repository, name), value);
};
const commit = (...names: string[]): string => {
  names.forEach((name) => write(name));
  git('add', '-A');
  git('commit', '-qm', 'Fixture');
  return git('rev-parse', 'HEAD');
};
const run = (hook: 'pre-commit' | 'pre-push', input = '', npmStatus = 0) => {
  writeFileSync(log, '');
  const result = spawnSync('/bin/bash', [join(repository, '.githooks', hook)], {cwd: repository,
    encoding: 'utf8', env: {...environment(), METROPOLIS_HOOK_LOG: log, METROPOLIS_HOOK_TEMP_ROOT: directory, METROPOLIS_NPM_STATUS: String(npmStatus),
      PATH: `${binaries}:${process.env.PATH}`}, input});
  return {calls: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean), status: result.status};
};
const push = (head: string, base: string): string => `refs/heads/task ${head} refs/heads/task ${base}\n`;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'metropolis-hook-'));
  repository = join(directory, 'repo');
  binaries = join(directory, 'bin');
  log = join(directory, 'npm.log');
  mkdirSync(repository);
  mkdirSync(binaries);
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Fixture');
  git('config', 'user.email', 'fixture@example.test');
  mkdirSync(join(repository, '.githooks'));
  for(const name of ['pre-commit', 'pre-push']) {
    copyFileSync(join(hooks, name), join(repository, '.githooks', name));
  }
  writeFileSync(join(binaries, 'npm'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$METROPOLIS_HOOK_LOG"\nexit "$METROPOLIS_NPM_STATUS"\n');
  chmodSync(join(binaries, 'npm'), 0o755);
  commit('README.md', 'src/seed.js');
});

afterEach(() => {
  rmSync(directory, {force: true, recursive: true});
});

describe('MetropolisJS actual pre-commit hook', () => {
  it.each(code)('runs only units for staged .%s', (extension) => {
    write(`src/new.${extension}`);
    git('add', '-A');

    expect(run('pre-commit')).toEqual({calls: ['test -- --onlyChanged --passWithNoTests'], status: 0});
  });

  it.each(['README.md', 'package.json', 'data.json', 'logo.png', 'style.css', 'style.scss', 'index.html'])(
    'runs no suite for staged %s', (name) => {
      write(name, 'changed');
      git('add', '-A');

      expect(run('pre-commit')).toEqual({calls: [], status: 0});
    }
  );

  it('counts staged code deletions', () => {
    git('rm', 'src/seed.js');

    expect(run('pre-commit').calls).toEqual(['test -- --onlyChanged --passWithNoTests']);
  });

  it('counts staged code renames', () => {
    git('mv', 'src/seed.js', 'src/renamed.js');

    expect(run('pre-commit').calls).toEqual(['test -- --onlyChanged --passWithNoTests']);
  });

  it('counts a source rename to another extension', () => {
    git('mv', 'src/seed.js', 'src/seed.txt');

    expect(run('pre-commit').calls).toEqual(['test -- --onlyChanged --passWithNoTests']);
  });

  it.each(['src/café.ts', 'src/quote".ts', 'src/line\nbreak.ts'])(
    'counts staged quoted filename %s', (name) => {
      write(name);
      git('add', '-A');

      expect(run('pre-commit').calls).toEqual(['test -- --onlyChanged --passWithNoTests']);
    }
  );

  it('isolates fixture Git commands from inherited hook repository variables', () => {
    vi.stubEnv('GIT_DIR', join(directory, 'foreign.git'));
    vi.stubEnv('GIT_INDEX_FILE', join(directory, 'foreign.index'));
    try {
      write('src/seed.js', 'changed');
      git('add', '-A');

      expect(git('rev-parse', '--show-toplevel')).toBe(realpathSync(repository));
      expect(run('pre-commit')).toEqual({calls: ['test -- --onlyChanged --passWithNoTests'], status: 0});
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ignores unstaged code', () => {
    write('src/seed.js', 'unstaged');

    expect(run('pre-commit')).toEqual({calls: [], status: 0});
  });

  it('propagates unit failure', () => {
    write('src/seed.js', 'changed');
    git('add', '-A');

    expect(run('pre-commit', '', 17)).toEqual({calls: ['test -- --onlyChanged --passWithNoTests'], status: 17});
  });
});

describe('MetropolisJS actual pre-push hook', () => {
  it.each([...code, 'css'])('runs only E2E for pushed .%s', (extension) => {
    const base = git('rev-parse', 'HEAD');
    const head = commit(`src/new.${extension}`);

    expect(run('pre-push', push(head, base))).toEqual({calls: ['run test:e2e'], status: 0});
  });

  it.each(['README.md', 'package.json', 'data.json', 'logo.png', 'index.html'])(
    'runs no suite for pushed %s', (name) => {
      const base = git('rev-parse', 'HEAD');
      write(name, 'changed');
      git('add', '-A');
      git('commit', '-qm', 'Changed');

      expect(run('pre-push', push(git('rev-parse', 'HEAD'), base))).toEqual({calls: [], status: 0});
    }
  );

  it('includes earlier commits in the pushed range', () => {
    const base = git('rev-parse', 'HEAD');
    commit('src/new.ts');
    const head = commit('docs/change.md');

    expect(run('pre-push', push(head, base)).calls).toEqual(['run test:e2e']);
  });

  it('compares a new branch with its default-branch fork', () => {
    git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    const head = commit('docs/change.md');

    expect(run('pre-push', push(head, zero))).toEqual({calls: [], status: 0});
  });

  it('counts a pushed source rename to another extension', () => {
    const base = git('rev-parse', 'HEAD');
    git('mv', 'src/seed.js', 'src/seed.txt');
    git('commit', '-qm', 'Renamed');

    expect(run('pre-push', push(git('rev-parse', 'HEAD'), base)).calls).toEqual(['run test:e2e']);
  });

  it.each(['src/café.ts', 'src/quote".ts', 'src/line\nbreak.ts'])(
    'counts pushed quoted filename %s', (name) => {
      const base = git('rev-parse', 'HEAD');
      const head = commit(name);

      expect(run('pre-push', push(head, base)).calls).toEqual(['run test:e2e']);
    }
  );

  it.each(['src/seed.js', 'src/reverted.ts', 'src/reverted.css'])(
    'includes changed then reverted %s in the pushed range', (name) => {
      const base = git('rev-parse', 'HEAD');
      write(name, 'changed');
      git('add', '-A');
      git('commit', '-qm', 'Code');
      git('revert', '--no-edit', 'HEAD');

      expect(run('pre-push', push(git('rev-parse', 'HEAD'), base)).calls).toEqual(['run test:e2e']);
    }
  );

  it('includes a code resolution introduced only by a merge commit', () => {
    git('checkout', '-qb', 'side');
    commit('docs/side.md');
    git('checkout', 'main');
    const base = commit('docs/main.md');
    git('merge', '--no-ff', '--no-commit', 'side');
    write('src/seed.js', 'merge resolution');
    git('add', '-A');
    git('commit', '-qm', 'Merge');

    expect(run('pre-push', push(git('rev-parse', 'HEAD'), base)).calls).toEqual(['run test:e2e']);
  });

  it('runs E2E if a range cannot be read', () => {
    expect(run('pre-push', push(git('rev-parse', 'HEAD'), 'f'.repeat(40))).calls).toEqual(['run test:e2e']);
  });

  it('does not run a suite for a deleted branch', () => {
    expect(run('pre-push', push(zero, git('rev-parse', 'HEAD')))).toEqual({calls: [], status: 0});
  });

  it('propagates E2E failure', () => {
    const base = git('rev-parse', 'HEAD');
    const head = commit('src/new.ts');

    expect(run('pre-push', push(head, base), 29)).toEqual({calls: ['run test:e2e'], status: 29});
  });
});

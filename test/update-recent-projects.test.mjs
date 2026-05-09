import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fallbackSummary,
  formatProjectList,
  replaceGeneratedSection,
  selectRecentRepos,
} from '../scripts/update-recent-projects.mjs';

test('replaceGeneratedSection only replaces the generated marker block', () => {
  const readme = [
    '# Title',
    '',
    '<!-- recent-projects:start -->',
    'old content',
    '<!-- recent-projects:end -->',
    '',
    'footer',
  ].join('\n');

  const updated = replaceGeneratedSection(readme, 'new content');

  assert.equal(
    updated,
    [
      '# Title',
      '',
      '<!-- recent-projects:start -->',
      'new content',
      '<!-- recent-projects:end -->',
      '',
      'footer',
    ].join('\n'),
  );
});

test('selectRecentRepos filters profile repo, private repos and sorts by pushed time', () => {
  const repos = [
    { name: 'old', private: false, fork: false, archived: false, pushed_at: '2026-01-01T00:00:00Z' },
    { name: 'metadata-only', private: false, fork: false, archived: false, pushed_at: '2026-01-02T00:00:00Z', updated_at: '2026-05-10T00:00:00Z' },
    { name: 'CHENJIAMIAN', private: false, fork: false, archived: false, pushed_at: '2026-05-09T00:00:00Z' },
    { name: 'private-one', private: true, fork: false, archived: false, pushed_at: '2026-05-08T00:00:00Z' },
    { name: 'fork-one', private: false, fork: true, archived: false, pushed_at: '2026-05-08T00:00:00Z' },
    { name: 'archived-one', private: false, fork: false, archived: true, pushed_at: '2026-05-08T00:00:00Z' },
    { name: 'new', private: false, fork: false, archived: false, pushed_at: '2026-05-07T00:00:00Z' },
  ];

  const selected = selectRecentRepos(repos, 'CHENJIAMIAN', 3);

  assert.deepEqual(
    selected.map((repo) => repo.name),
    ['new', 'metadata-only', 'old'],
  );
});

test('formatProjectList renders project links and summaries', () => {
  const markdown = formatProjectList([
    {
      name: 'demo',
      html_url: 'https://github.com/CHENJIAMIAN/demo',
      summary: '演示项目。',
      language: 'JavaScript',
    },
  ]);

  assert.equal(
    markdown,
    [
      '- **[demo](https://github.com/CHENJIAMIAN/demo)**<br>',
      '  演示项目。（JavaScript）',
    ].join('\n'),
  );
});

test('fallbackSummary uses description and falls back to repository name', () => {
  assert.equal(
    fallbackSummary({ name: 'demo', description: 'A demo project.' }),
    'A demo project.',
  );
  assert.equal(
    fallbackSummary({ name: 'demo', description: '' }),
    'demo 项目。',
  );
});

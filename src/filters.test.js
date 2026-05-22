const { matchesFilters, extractContext } = require('./filters');

function makePushPayload(branch = 'main', repo = 'owner/repo') {
  return {
    ref: `refs/heads/${branch}`,
    repository: { full_name: repo },
    pusher: { name: 'alice' },
    commits: [{ id: 'abc123' }, { id: 'def456' }],
    head_commit: { id: 'def456' },
  };
}

describe('matchesFilters', () => {
  test('returns true with no filters', () => {
    expect(matchesFilters(makePushPayload(), {})).toBe(true);
  });

  test('matches single branch filter', () => {
    const payload = makePushPayload('main');
    expect(matchesFilters(payload, { branch: 'main' })).toBe(true);
    expect(matchesFilters(payload, { branch: 'develop' })).toBe(false);
  });

  test('matches array of branches', () => {
    const payload = makePushPayload('develop');
    expect(matchesFilters(payload, { branch: ['main', 'develop'] })).toBe(true);
    expect(matchesFilters(payload, { branch: ['main', 'staging'] })).toBe(false);
  });

  test('matches repository filter', () => {
    const payload = makePushPayload('main', 'myorg/myrepo');
    expect(matchesFilters(payload, { repository: 'myorg/myrepo' })).toBe(true);
    expect(matchesFilters(payload, { repository: 'myorg/other' })).toBe(false);
  });

  test('matches both branch and repository', () => {
    const payload = makePushPayload('main', 'myorg/myrepo');
    expect(matchesFilters(payload, { branch: 'main', repository: 'myorg/myrepo' })).toBe(true);
    expect(matchesFilters(payload, { branch: 'develop', repository: 'myorg/myrepo' })).toBe(false);
  });

  test('returns false for null payload', () => {
    expect(matchesFilters(null, {})).toBe(false);
  });
});

describe('extractContext', () => {
  test('extracts expected fields', () => {
    const ctx = extractContext(makePushPayload('main', 'owner/repo'));
    expect(ctx.branch).toBe('main');
    expect(ctx.repository).toBe('owner/repo');
    expect(ctx.pusher).toBe('alice');
    expect(ctx.commitCount).toBe(2);
    expect(ctx.headCommit).toBe('def456');
  });

  test('handles missing optional fields gracefully', () => {
    const ctx = extractContext({ ref: 'refs/heads/main' });
    expect(ctx.branch).toBe('main');
    expect(ctx.repository).toBeNull();
    expect(ctx.pusher).toBeNull();
    expect(ctx.commitCount).toBe(0);
    expect(ctx.headCommit).toBeNull();
  });
});

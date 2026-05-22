/**
 * Filter incoming GitHub push events based on config rules.
 */

/**
 * Check if a push event matches the configured filters.
 * @param {Object} payload - GitHub webhook payload
 * @param {Object} filters - Filter config (branch, repository)
 * @returns {boolean}
 */
function matchesFilters(payload, filters = {}) {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  if (filters.branch) {
    const ref = payload.ref || '';
    const pushedBranch = ref.replace('refs/heads/', '');
    const allowed = Array.isArray(filters.branch)
      ? filters.branch
      : [filters.branch];
    if (!allowed.includes(pushedBranch)) {
      return false;
    }
  }

  if (filters.repository) {
    const repoName = payload.repository && payload.repository.full_name;
    const allowed = Array.isArray(filters.repository)
      ? filters.repository
      : [filters.repository];
    if (!repoName || !allowed.includes(repoName)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract useful context from a push payload.
 * @param {Object} payload
 * @returns {Object}
 */
function extractContext(payload) {
  return {
    branch: (payload.ref || '').replace('refs/heads/', ''),
    repository: payload.repository ? payload.repository.full_name : null,
    pusher: payload.pusher ? payload.pusher.name : null,
    commitCount: Array.isArray(payload.commits) ? payload.commits.length : 0,
    headCommit: payload.head_commit ? payload.head_commit.id : null,
  };
}

module.exports = { matchesFilters, extractContext };

// Padrão Conventional Commits (feat, fix, docs, test, chore, ci...).
// Validado no hook commit-msg (husky) e no CI (workflow Linting).
export default {
  extends: ['@commitlint/config-conventional'],
};

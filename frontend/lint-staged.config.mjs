// lint-staged usa o config mais próximo de cada arquivo staged e roda os
// comandos neste diretório. Por isso o frontend repete a verificação de
// segredos do config da raiz, além de formatar e lintar o TypeScript.
export default {
  '*': 'secretlint --no-glob --secretlintrc ../.secretlintrc.json',
  '*.{ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.css': 'prettier --write',
};

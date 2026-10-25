// lint-staged usa o config mais próximo de cada arquivo staged e roda os
// comandos neste diretório. Por isso o backend repete a verificação de
// segredos do config da raiz, além de formatar e lintar o TypeScript.
export default {
  '*': 'secretlint --no-glob --secretlintrc ../.secretlintrc.json',
  '*.ts': ['prettier --write', 'eslint --fix'],
};

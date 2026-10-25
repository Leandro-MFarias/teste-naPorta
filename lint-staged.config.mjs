// Executado no hook pre-commit (husky) apenas sobre os arquivos staged.
export default {
  // Bloqueia o commit se algum arquivo contiver segredo (token, chave,
  // senha preenchida em .env etc.).
  '*': 'secretlint --no-glob',
};

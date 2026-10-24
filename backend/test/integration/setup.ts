import { randomBytes } from 'node:crypto';
import { resolveTestDatabaseUrl } from './database.js';

// Ambiente dos testes de integração, definido antes de importar a
// aplicação. Variáveis do ambiente têm prioridade sobre os arquivos .env,
// então a aplicação usa o banco de teste e um segredo JWT descartável.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET = randomBytes(48).toString('base64url');
process.env.JWT_EXPIRES_IN = '5h';

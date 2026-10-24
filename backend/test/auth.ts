import { JwtService } from '@nestjs/jwt';

/** Segredo usado apenas nos testes. */
export const TEST_JWT_SECRET = 'test-secret-with-at-least-32-characters!!';

export const testJwtService = new JwtService({
  secret: TEST_JWT_SECRET,
  signOptions: { algorithm: 'HS256' },
  verifyOptions: { algorithms: ['HS256'] },
});

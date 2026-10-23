// Decorators do NestJS e do class-transformer leem metadados via Reflect.
// Na aplicação o @nestjs/core carrega o polyfill; nos testes, carregamos aqui.
import 'reflect-metadata';

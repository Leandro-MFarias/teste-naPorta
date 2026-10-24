import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service.js';

/** Sem controller: clientes são geridos pelas operações de pedido. */
@Module({
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

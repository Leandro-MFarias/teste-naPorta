import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { MailModule } from '../mail/mail.module.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [CustomersModule, MailModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}

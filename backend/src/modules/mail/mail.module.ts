import { Module } from '@nestjs/common';
import { EmailSender } from './email-sender.js';
import { MailService } from './mail.service.js';
import { SmtpEmailSender } from './smtp-email-sender.js';

@Module({
  providers: [MailService, { provide: EmailSender, useClass: SmtpEmailSender }],
  exports: [MailService],
})
export class MailModule {}

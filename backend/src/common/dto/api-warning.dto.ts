import { ApiProperty } from '@nestjs/swagger';
import {
  API_WARNING_CODES,
  type ApiWarning,
  type ApiWarningCode,
} from '../interfaces/api-response.interface.js';

export class ApiWarningDto implements ApiWarning {
  @ApiProperty({ enum: API_WARNING_CODES, example: 'CUSTOMER_NAME_UPDATED' })
  code: ApiWarningCode;

  @ApiProperty({
    description:
      'Texto do aviso. Em CUSTOMER_NAME_UPDATED varia com o tipo do cliente: "CPF já cadastrado. O nome do cliente foi atualizado." (PERSON) ou "CNPJ já cadastrado. A razão social foi atualizada." (COMPANY).',
    example: 'CPF já cadastrado. O nome do cliente foi atualizado.',
  })
  message: string;
}

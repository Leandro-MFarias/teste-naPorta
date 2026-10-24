import { ApiProperty } from '@nestjs/swagger';
import type { ApiResponse } from '../../../common/interfaces/api-response.interface.js';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type { LoginResponse } from '../interfaces/login.interface.js';

export class LoginResponseDto implements LoginResponse {
  @ApiProperty({ description: 'Access token JWT.' })
  accessToken: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({
    description: 'Validade do token em segundos.',
    example: 18000,
  })
  expiresIn: number;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class LoginDataResponseDto implements ApiResponse<LoginResponse> {
  @ApiProperty({ type: LoginResponseDto })
  data: LoginResponseDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import type { ApiResponse } from '../../../common/interfaces/api-response.interface.js';
import type { UserResponse } from '../interfaces/user-response.interface.js';

export class UserResponseDto implements UserResponse {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria Souza' })
  name: string;

  @ApiProperty({ example: 'maria.souza@example.com' })
  email: string;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({
    description:
      'true enquanto o usuário não trocar a senha temporária. Nesse estado, apenas GET /auth/me e POST /auth/change-password são permitidos.',
    example: false,
  })
  mustChangePassword: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}

export class UserDataResponseDto implements ApiResponse<UserResponse> {
  @ApiProperty({ type: UserResponseDto })
  data: UserResponseDto;
}

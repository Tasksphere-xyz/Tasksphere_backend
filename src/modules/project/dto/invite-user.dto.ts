import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ description: 'email of the user to invite' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

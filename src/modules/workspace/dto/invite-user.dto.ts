import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsEmail } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ description: 'List of user emails to invite' })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  emails: string[];
}

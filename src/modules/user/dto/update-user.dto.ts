import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'username of the user' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'display picture url of the user' })
  @IsOptional()
  @IsString()
  displayPic?: string;
}

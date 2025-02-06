import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'username of the user' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ 
    description: 'Profile picture upload', 
    type: 'string', 
    format: 'binary', 
    required: false 
  })
  @IsOptional()
  profileImg?: any;
}

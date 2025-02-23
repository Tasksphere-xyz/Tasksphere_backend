import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReplyDto {
  @ApiProperty({ description: 'content of the reply' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

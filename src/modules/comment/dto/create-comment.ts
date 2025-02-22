import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ description: 'content of the comment' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

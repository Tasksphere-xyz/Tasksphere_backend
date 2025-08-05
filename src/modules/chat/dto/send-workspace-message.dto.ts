/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class SendWorkspaceMessageDto {
  @ApiProperty({ description: 'Workspace ID', example: 1 })
  @Transform(({ value }) => {
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error('workspace_id must be a valid number');
    }
    return num;
  })
  @IsNumber()
  @IsNotEmpty()
  workspace_id: number;

  @ApiProperty({
    description:
      'Message content. Use mentions in the format @username(email@example.com)',
    example: 'Hello @alice(alice@example.com), please review the document.',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'File URL (if any)',
    example: 'https://cloudinary.com/sample.jpg',
    required: false,
  })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}

/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class SendWorkspaceMessageDto {
  @ApiProperty({ description: 'Sender email', example: 'me@example.com' })
  @IsString()
  @IsNotEmpty()
  sender_email: string;

  @ApiProperty({ description: 'Workspace ID', example: 1 })
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

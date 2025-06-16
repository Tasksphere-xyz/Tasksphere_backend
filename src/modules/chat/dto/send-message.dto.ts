/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the workspace where the chat takes place' })
  @IsNotEmpty()
  @IsNumber()
  workspace_id: number;

  // @ApiProperty({ description: 'Sender email', example: 'me@example.com' })
  // @IsString()
  // @IsNotEmpty()
  // sender_email: string;

  @ApiProperty({ description: 'Receiver email', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  receiver_email: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello there!',
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

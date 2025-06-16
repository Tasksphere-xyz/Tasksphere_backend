/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsNotEmpty,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskDto {
  @ApiProperty({ description: 'ID of the workspace this task belongs to' })
  @IsNotEmpty()
  @IsNumber()
  workspace_id: number;
  
  @ApiProperty({ description: 'Title of the task' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Priority of the task',
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @IsNotEmpty()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @ApiProperty({ description: 'Title of the task' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Id of user assigned to the task',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  assigned_to?: number;

  @ApiProperty({
    description: 'Attachment file',
    required: false,
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  attachment?: string;

  @ApiProperty({
    description: 'Start date of the task',
    type: String,
    format: 'date-time',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  start_date: Date;

  @ApiProperty({
    description: 'Due date of the task',
    type: String,
    format: 'date-time',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  due_date: Date;
}

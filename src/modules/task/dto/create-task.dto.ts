/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

  @ApiProperty({ description: 'Description of the task', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'IDs of users assigned to the task (can be an array or comma-separated string)',
    required: false,
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // If the input is already an array, return it
    if (Array.isArray(value)) return value.map((v) => Number(v));
    // If it's a comma-separated string, split and convert to numbers
    if (typeof value === 'string')
      return value.split(',').map((v) => Number(v.trim()));
    // Otherwise, wrap a single value in an array
    return [Number(value)];
  })
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_to?: number[];

  @ApiProperty({
    description: 'Attachment file',
    required: false,
    type: 'string',
    format: 'binary',
  })
  attachment?: any;

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

  @ApiProperty({ 
    description: 'Contract ID for the task on blockchain',
    required: false 
  })
  @IsOptional()
  @IsString()
  taskContractId?: string;
}

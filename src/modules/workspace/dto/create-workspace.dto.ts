/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
    @ApiProperty({ description: 'name of the workspace' })
    @IsNotEmpty()
    @IsString()
    workspace_name: string;

    @ApiProperty({ description: 'description of the workspace' })
    @IsOptional()
    @IsString()
    description?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({ description: 'name of the project' })
    @IsNotEmpty()
    @IsString()
    project_name: string;

    @ApiProperty({ description: 'description of the project' })
    @IsOptional()
    @IsString()
    description?: string;
}

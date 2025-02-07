import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkspaceDto {
    @ApiProperty({ description: 'name of the workspace' })
    @IsNotEmpty()
    @IsString()
    workspace_name: string;
}

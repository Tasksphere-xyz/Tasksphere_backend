import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateWorkspaceDto {
    @IsNotEmpty()
    @IsString()
    workspace_name: string;
}

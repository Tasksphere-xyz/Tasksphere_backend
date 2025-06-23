/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsEmail } from 'class-validator';

export class CreateWorkspaceDto {
    @ApiProperty({ description: 'name of the workspace' })
    @IsNotEmpty()
    @IsString()
    workspace_name: string;

    @ApiProperty({
        description: 'Array of emails to invite to the workspace',
        type: [String],
        example: ['user1@example.com', 'user2@example.com']
    })
    @IsArray()
    @IsEmail({}, { each: true })
    @IsNotEmpty({ each: true })
    emails: string[];
}
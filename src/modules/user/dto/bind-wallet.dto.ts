/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class BindWalletDto {
    @ApiProperty({ description: 'wallet address of the user' })
    @IsNotEmpty()
    @IsString()
    wallet_address: string;
}
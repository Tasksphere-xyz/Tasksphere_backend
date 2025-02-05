import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;
}

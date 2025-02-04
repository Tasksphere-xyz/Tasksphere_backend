import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  displayPic?: string;

  @IsOptional()
  @IsEnum(['admin', 'member'], {
    message: 'role must be either "admin" or "member".',
  })
  role?: 'admin' | 'member';
}

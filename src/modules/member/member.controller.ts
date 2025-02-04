import { Controller, Body, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MemberService } from './member.service';
import { UpdateMemberDto } from './dto/update-member.dto';
import { UserPayload } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('member')
@Controller('member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Patch('update')
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createMemberDto: UpdateMemberDto,
    @Req() req: Request & { user: UserPayload },
  ) {
    const user = req.user;
    return await this.memberService.updateUserProfile(createMemberDto, user);
  }
}

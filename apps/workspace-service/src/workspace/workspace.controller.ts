import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CurrentUser } from 'libs/auth/src';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt-access'))
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: any) {
    return this.workspaceService.findAllForUser(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workspaceService.findOne(id, user.id);
  }

  @Post(':id/members')
  addMember(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspaceService.addMember(id, user.id, dto.userId, dto.role);
  }
}

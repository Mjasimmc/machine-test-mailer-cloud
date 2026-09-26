import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, UserDto } from '@saas/shared';

@Controller('admin')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async listUsers(@Query('search') search?: string): Promise<UserDto[]> {
    return this.adminService.listUsers(search);
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/suspend')
  async suspendUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<UserDto> {
    return this.adminService.suspendUser(id, adminId);
  }

  @Patch('users/:id/unsuspend')
  async unsuspendUser(@Param('id') id: string): Promise<UserDto> {
    return this.adminService.unsuspendUser(id);
  }
}

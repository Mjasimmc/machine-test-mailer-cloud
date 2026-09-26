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
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission, Role, UserDto } from '@saas/shared';

@Controller('admin')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @RequirePermissions(Permission.USERS_READ)
  listUsers(@Query('search') search?: string): Promise<UserDto[]> {
    return this.adminService.listUsers(search);
  }

  @Get('users/:id')
  @RequirePermissions(Permission.USERS_READ)
  getUser(@Param('id') id: string): Promise<UserDto> {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/suspend')
  @RequirePermissions(Permission.USERS_SUSPEND)
  suspendUser(
    @Param('id') id: string,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<UserDto> {
    return this.adminService.suspendUser(id, currentAdminId);
  }

  @Patch('users/:id/unsuspend')
  @RequirePermissions(Permission.USERS_SUSPEND)
  unsuspendUser(
    @Param('id') id: string,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<UserDto> {
    return this.adminService.unsuspendUser(id, currentAdminId);
  }
}


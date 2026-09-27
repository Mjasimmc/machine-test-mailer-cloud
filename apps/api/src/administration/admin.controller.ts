import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permission, Role, UserDto } from '@saas/shared';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @RequirePermissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'List tenant/workspace users with optional search filtering' })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  listUsers(@Query('search') search?: string): Promise<UserDto[]> {
    return this.adminService.listUsers(search);
  }

  @Get('users/:id')
  @RequirePermissions(Permission.USERS_READ)
  @ApiOperation({ summary: 'Get detailed user record by ID' })
  @ApiResponse({ status: 200, description: 'User record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string): Promise<UserDto> {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/suspend')
  @RequirePermissions(Permission.USERS_SUSPEND)
  @ApiOperation({ summary: 'Suspend user account and revoke active socket sessions' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 400, description: 'Self-suspension or admin suspension prohibited' })
  @ApiResponse({ status: 404, description: 'User not found' })
  suspendUser(
    @Param('id') id: string,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<UserDto> {
    return this.adminService.suspendUser(id, currentAdminId);
  }

  @Patch('users/:id/unsuspend')
  @RequirePermissions(Permission.USERS_SUSPEND)
  @ApiOperation({ summary: 'Reactivate suspended user account' })
  @ApiResponse({ status: 200, description: 'User reactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unsuspendUser(
    @Param('id') id: string,
    @CurrentUser('id') currentAdminId: string,
  ): Promise<UserDto> {
    return this.adminService.unsuspendUser(id, currentAdminId);
  }
}



import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardStats, Role } from '@saas/shared';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin/dashboard/stats')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get administrative metrics and user statistics (legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  getAdminStatsLegacy(): Promise<DashboardStats> {
    return this.dashboardService.getAdminStats();
  }

  @Get('dashboard/admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get administrative metrics and user statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved successfully' })
  getAdminStats(): Promise<DashboardStats> {
    return this.dashboardService.getAdminStats();
  }

  @Get('dashboard/user')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @ApiOperation({ summary: 'Get standard user dashboard status' })
  @ApiResponse({ status: 200, description: 'User dashboard overview retrieved successfully' })
  getUserDashboard() {
    return {
      message: 'User dashboard overview',
      status: 'active',
    };
  }
}


import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardStats, Role } from '@saas/shared';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin/dashboard/stats')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminStatsLegacy(): Promise<DashboardStats> {
    return this.dashboardService.getAdminStats();
  }

  @Get('dashboard/admin')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getAdminStats(): Promise<DashboardStats> {
    return this.dashboardService.getAdminStats();
  }

  @Get('dashboard/user')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  getUserDashboard() {
    return {
      message: 'User dashboard overview',
      status: 'active',
    };
  }
}

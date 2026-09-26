import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [UsersModule, RealtimeModule],
  controllers: [AdminController, DashboardController],
  providers: [AdminService, DashboardService],
  exports: [AdminService, DashboardService],
})
export class AdministrationModule {}

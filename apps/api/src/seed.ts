import * as dotenv from 'dotenv';
import * as path from 'path';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Role, UserStatus } from '@saas/shared';
import { User, UserSchema } from './users/schemas/user.schema';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/saas_db';

const SAMPLE_USERS = [
  { name: 'Alex Morgan', email: 'alex.morgan@company.com', status: UserStatus.ACTIVE },
  { name: 'Sarah Chen', email: 'sarah.chen@techflow.io', status: UserStatus.ACTIVE },
  { name: 'Marcus Vance', email: 'marcus.vance@vancestudios.com', status: UserStatus.ACTIVE },
  { name: 'Elena Rostova', email: 'elena.rostova@cloudscale.net', status: UserStatus.ACTIVE },
  { name: 'David Kim', email: 'david.kim@apexdesign.co', status: UserStatus.SUSPENDED },
  { name: 'Olivia Taylor', email: 'olivia.taylor@fintechpulse.com', status: UserStatus.ACTIVE },
  { name: 'Liam O\'Connor', email: 'liam.oconnor@celticdata.ie', status: UserStatus.ACTIVE },
  { name: 'Priya Sharma', email: 'priya.sharma@innovatech.in', status: UserStatus.ACTIVE },
  { name: 'Carlos Mendez', email: 'carlos.mendez@solarsystems.mx', status: UserStatus.ACTIVE },
  { name: 'Hannah Schmidt', email: 'hannah.schmidt@berlinai.de', status: UserStatus.SUSPENDED },
  { name: 'James Wilson', email: 'james.wilson@nexusapps.co.uk', status: UserStatus.ACTIVE },
  { name: 'Aisha Al-Mansoor', email: 'aisha.mansoor@gulfcloud.ae', status: UserStatus.ACTIVE },
  { name: 'Kenji Sato', email: 'kenji.sato@tokyolabs.jp', status: UserStatus.ACTIVE },
  { name: 'Lucas Silva', email: 'lucas.silva@paulista.br', status: UserStatus.SUSPENDED },
  { name: 'Emily Clark', email: 'emily.clark@venturehub.org', status: UserStatus.ACTIVE },
];

async function seed() {
  console.log(`[Seed] Connecting to MongoDB: ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const UserModel = mongoose.model<User>('User', UserSchema);

  // 1. Ensure the single Admin account exists
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@saas.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const adminName = process.env.ADMIN_NAME || 'SaaS Administrator';

  console.log(`[Seed] Checking for existing admin account: ${adminEmail}...`);
  let admin = await UserModel.findOne({ role: Role.ADMIN });

  const saltRounds = 10;

  if (!admin) {
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
    admin = await UserModel.create({
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    });
    console.log(`[Seed] Created admin account: ${admin.email} (ID: ${admin._id})`);
  } else {
    console.log(`[Seed] Existing admin found: ${admin.email} (ID: ${admin._id})`);
  }

  // 2. Feed sample regular users
  console.log(`[Seed] Seeding sample users...`);
  const defaultUserPassword = 'UserPassword123!';
  const userPasswordHash = await bcrypt.hash(defaultUserPassword, saltRounds);

  let createdCount = 0;
  let existingCount = 0;

  for (const sample of SAMPLE_USERS) {
    const existing = await UserModel.findOne({ email: sample.email.toLowerCase() });
    if (existing) {
      existingCount++;
    } else {
      await UserModel.create({
        name: sample.name,
        email: sample.email.toLowerCase(),
        passwordHash: userPasswordHash,
        role: Role.USER,
        status: sample.status,
      });
      createdCount++;
    }
  }

  console.log(`[Seed] Sample users processed: ${createdCount} created, ${existingCount} already existed.`);

  const totalUsers = await UserModel.countDocuments({ role: Role.USER });
  const activeUsers = await UserModel.countDocuments({ role: Role.USER, status: UserStatus.ACTIVE });
  const suspendedUsers = await UserModel.countDocuments({ role: Role.USER, status: UserStatus.SUSPENDED });

  console.log(`\n================ Database Summary ================`);
  console.log(`  Admin Account:   ${admin.email}`);
  console.log(`  Total Users:     ${totalUsers}`);
  console.log(`  Active Users:    ${activeUsers}`);
  console.log(`  Suspended Users: ${suspendedUsers}`);
  console.log(`  User Password:   ${defaultUserPassword}`);
  console.log(`==================================================\n`);

  await mongoose.disconnect();
}

seed()
  .catch((err) => {
    console.error('[Seed] Error during seeding:', err);
    process.exit(1);
  });

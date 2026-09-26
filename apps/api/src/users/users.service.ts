import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserStatus } from '@saas/shared';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async create(userData: Partial<User>): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...userData,
      email: userData.email?.toLowerCase().trim(),
    });
    return createdUser.save();
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updates: Record<string, any> = {};

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const targetEmail = dto.email.toLowerCase().trim();
      const existing = await this.findByEmail(targetEmail);
      if (existing && existing._id.toString() !== user._id.toString()) {
        throw new ConflictException('Email address is already in use by another account');
      }
      updates.email = targetEmail;
    }

    if (dto.name && dto.name.trim()) {
      updates.name = dto.name.trim();
    }

    const updated = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true },
    );
    if (!updated) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return updated;
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async incrementTokenVersion(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $inc: { tokenVersion: 1 } },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updatePassword(id: string, passwordHash: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      {
        passwordHash,
        $inc: { tokenVersion: 1 },
      },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findAll(search?: string, tenantId?: string): Promise<UserDocument[]> {
    const filter: any = {};
    if (tenantId) {
      filter.tenantId = tenantId;
    }
    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
      ];
    }
    return this.userModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async count(filter: any = {}): Promise<number> {
    return this.userModel.countDocuments(filter).exec();
  }
}

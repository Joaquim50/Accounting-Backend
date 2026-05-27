import { prisma } from '../db';
import bcrypt from 'bcryptjs';
import { User, Prisma, UserStatus } from '@prisma/client';

export interface UserFilterOptions {
  search?: string;
  roleId?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export class UserService {
  // 1. Get paginated and filtered list of users
  static async getUsers(options: UserFilterOptions) {
    const { search, roleId, status, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    // Apply search filter (first name, last name, email)
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by roleId
    if (roleId) {
      whereClause.roleId = roleId;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        include: {
          role: {
            select: {
              id: true,
              roleName: true,
              description: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Format results to omit password hashes
    const formattedUsers = users.map(user => {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    });

    return {
      users: formattedUsers,
      meta: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  }

  // 2. Get single user by ID (safe details only)
  static async getUserById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: {
            permissions: true
          }
        }
      }
    });

    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // 3. Create user
  static async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    mobile?: string | null;
    roleId: string;
    createdBy?: string;
  }) {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      if (existing.deletedAt) {
        // If soft deleted, we will hard delete or reuse. Let's hard delete the soft-deleted one to free the unique email!
        await prisma.user.delete({ where: { id: existing.id } });
      } else {
        throw new Error('Email address is already in use');
      }
    }

    // Verify role exists
    const roleExists = await prisma.role.findFirst({
      where: { id: data.roleId, deletedAt: null }
    });
    if (!roleExists) {
      throw new Error('Assigned role does not exist');
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        mobile: data.mobile,
        roleId: data.roleId,
        status: 'ACTIVE',
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
      include: {
        role: true
      }
    });

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // 4. Update user details
  static async updateUser(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      mobile?: string | null;
      roleId?: string;
      status?: UserStatus;
      updatedBy?: string;
    }
  ) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updateData: Prisma.UserUpdateInput = {
      updatedBy: data.updatedBy,
    };

    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;

    if (data.email && data.email.toLowerCase().trim() !== user.email) {
      const emailLower = data.email.toLowerCase().trim();
      const existing = await prisma.user.findFirst({
        where: { email: emailLower }
      });
      if (existing && existing.id !== id) {
        throw new Error('Email address is already in use');
      }
      updateData.email = emailLower;
    }

    if (data.roleId && data.roleId !== user.roleId) {
      const roleExists = await prisma.role.findFirst({
        where: { id: data.roleId, deletedAt: null }
      });
      if (!roleExists) {
        throw new Error('Assigned role does not exist');
      }
      updateData.role = { connect: { id: data.roleId } };
    }

    if (data.status !== undefined) {
      // Prevent deactivating the only Super Admin in the system
      if (data.status === 'INACTIVE') {
        const superAdminRole = await prisma.role.findFirst({
          where: { roleName: 'Super Admin', deletedAt: null }
        });
        if (superAdminRole && user.roleId === superAdminRole.id) {
          const activeAdmins = await prisma.user.count({
            where: { roleId: superAdminRole.id, status: 'ACTIVE', deletedAt: null }
          });
          if (activeAdmins <= 1) {
            throw new Error('Cannot deactivate the last remaining active Super Admin');
          }
        }
      }
      updateData.status = data.status;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true
      }
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }

  // 5. Delete user (soft or hard delete)
  static async deleteUser(id: string, hard: boolean = false) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const superAdminRole = await prisma.role.findFirst({
      where: { roleName: 'Super Admin', deletedAt: null }
    });
    if (superAdminRole && user.roleId === superAdminRole.id) {
      const activeAdmins = await prisma.user.count({
        where: { roleId: superAdminRole.id, status: 'ACTIVE', deletedAt: null }
      });
      if (activeAdmins <= 1) {
        throw new Error('Cannot delete the last remaining active Super Admin');
      }
    }

    if (hard) {
      await prisma.user.delete({ where: { id } });
      return { type: 'HARD' };
    } else {
      await prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date()
        }
      });
      return { type: 'SOFT' };
    }
  }

  // 6. User Status toggle (Activate / Deactivate)
  static async updateUserStatus(id: string, status: UserStatus, updatedBy?: string) {
    return this.updateUser(id, { status, updatedBy });
  }

  // 7. Change password (for logged-in user)
  static async changePassword(id: string, oldPass: string, newPass: string) {
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user || user.deletedAt) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) {
      throw new Error('Old password is incorrect');
    }

    const hash = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hash }
    });
  }

  // 8. Administrative password reset (bypasses old password)
  static async resetPassword(id: string, newPass: string, updatedBy?: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hash = await bcrypt.hash(newPass, 12);
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash: hash,
        updatedBy
      }
    });
  }
}

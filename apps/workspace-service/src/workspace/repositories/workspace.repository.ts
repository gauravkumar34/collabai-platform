import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';
import { Prisma, Workspace } from '@prisma/client';

@Injectable()
export class WorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.WorkspaceUncheckedCreateInput): Promise<Workspace> {
    return this.prisma.workspace.create({ data });
  }

  async findById(id: string) {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: { members: true },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.workspace.findUnique({ where: { slug } });
  }

  async findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: { members: true },
    });
  }

  async update(id: string, data: Prisma.WorkspaceUpdateInput) {
    return this.prisma.workspace.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspace.delete({ where: { id } });
  }
}
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { WorkspaceMemberRepository } from './repositories/workspace-member.repository';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceRole } from '@prisma/client';
import { KafkaProducerService } from '@app/common/kafka';
import { KAFKA_TOPICS } from '@app/common/events';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly memberRepo: WorkspaceMemberRepository,
    private readonly producer: KafkaProducerService,
  ) {}

  async create(ownerId: string, dto: CreateWorkspaceDto) {
    const existing = await this.workspaceRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictException('Slug already taken');

    const workspace = await this.workspaceRepo.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      ownerId,
      members: { create: { userId: ownerId, role: WorkspaceRole.OWNER } },
    });

    await this.producer.publish(
      KAFKA_TOPICS.WORKSPACE_CREATED,
      {
        workspaceId: workspace.id,
        ownerId,
        name: workspace.name,
        createdAt: workspace.createdAt.toISOString(),
      },
      'workspace.created',
      { key: workspace.id },
    );

    return workspace;
  }

  async findAllForUser(userId: string) {
    return this.workspaceRepo.findAllForUser(userId);
  }

  async findOne(workspaceId: string, requesterId: string) {
    const ws = await this.workspaceRepo.findById(workspaceId);
    if (!ws) throw new NotFoundException('Workspace not found');

    const isMember = ws.members.some((m) => m.userId === requesterId);
    if (!isMember) throw new ForbiddenException('Not a member');

    return ws;
  }

  async addMember(
    workspaceId: string,
    requesterId: string,
    userId: string,
    role: WorkspaceRole,
  ) {
    const requester = await this.memberRepo.findMembership(
      workspaceId,
      requesterId,
    );
    if (
      !requester ||
      !([WorkspaceRole.OWNER, WorkspaceRole.ADMIN] as WorkspaceRole[]).includes(requester.role)
    ) {
      throw new ForbiddenException('Only owners and admins can add members');
    }

    const existing = await this.memberRepo.findMembership(workspaceId, userId);
    if (existing) throw new ConflictException('Already a member');

    return this.memberRepo.add(workspaceId, userId, role);
  }

  /**
   * Called by event consumer when a new user is created.
   * Auto-provisions a personal workspace for them.
   */
  async createDefaultWorkspaceForUser(userId: string, userEmail: string) {
    const slug =
      `${userEmail.split('@')[0]}-${userId.slice(0, 6)}`.toLowerCase();
    const existing = await this.workspaceRepo.findBySlug(slug);
    if (existing) {
      this.logger.warn(`Default workspace for ${userId} already exists`);
      return existing;
    }

    return this.workspaceRepo.create({
      name: 'My Workspace',
      slug,
      ownerId: userId,
      members: { create: { userId, role: WorkspaceRole.OWNER } },
    });
  }
}

import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  JwtPayload,
  RefreshJwtPayload,
} from './interfaces/jwt-payload.interface';
import { KafkaProducerService } from '@app/common/kafka';
import { KAFKA_TOPICS } from '@app/common/events';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepo: UserRepository,
    private readonly refreshRepo: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly producer: KafkaProducerService, // ← add
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(
      dto.password,
      parseInt(this.config.get('BCRYPT_ROUNDS') ?? '12'),
    );

    const user = await this.userRepo.create({
      email: dto.email,
      password: hash,
      name: dto.name,
    });
    // 🔥 Publish event
    await this.producer.publish(
      KAFKA_TOPICS.USER_CREATED,
      {
        userId: user.id,
        email: user.email,
        name: user.name ?? undefined,
        createdAt: user.createdAt.toISOString(),
      },
      'user.created',
      { key: user.id }, // partition by user → ordering per user
    );
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByEmail(dto.email);
    // IMPORTANT: same error for both cases — don't leak which one was wrong
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isActive) throw new UnauthorizedException('Account disabled');

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findByHash(tokenHash);

    // CASE 1: Token doesn't exist → invalid
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    // CASE 2: Token was already revoked → REUSE DETECTED → kill the family
    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}. Revoking family ${stored.family}.`,
      );
      await this.refreshRepo.revokeFamily(stored.family);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    // CASE 3: Token expired
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // CASE 4: Valid → rotate it
    const user = await this.userRepo.findById(stored.userId);
    if (!user || !user.isActive) throw new UnauthorizedException();

    // Issue new tokens within the same family
    const tokens = await this.issueTokens(
      user.id,
      user.email,
      user.role,
      stored.family,
    );

    // Revoke the old token and link to the new one (audit trail)
    const newHash = this.hashToken(tokens.refreshToken);
    const newStored = await this.refreshRepo.findByHash(newHash);
    await this.refreshRepo.revokeById(stored.id, newStored?.id);

    return tokens;
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.refreshRepo.findByHash(tokenHash);
    if (stored && !stored.revokedAt) {
      await this.refreshRepo.revokeFamily(stored.family);
    }
    return { success: true };
  }

  // ─── helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
    family?: string,
  ) {
    const tokenFamily = family ?? randomUUID();
    const jti = randomUUID();

    const accessPayload: JwtPayload = { sub: userId, email, role };
    const refreshPayload: RefreshJwtPayload = {
      sub: userId,
      email,
      role,
      family: tokenFamily,
      jti,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN'),
    });

    // Store HASH of refresh token, not the token itself
    const tokenHash = this.hashToken(refreshToken);

    // Compute expiry date from env (7d → ms)
    const expiresAt = new Date(
      Date.now() +
        this.parseExpiresMs(
          this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d',
        ),
    );

    await this.refreshRepo.create({
      tokenHash,
      family: tokenFamily,
      expiresAt,
      user: { connect: { id: userId } },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private parseExpiresMs(s: string): number {
    const m = s.match(/^(\d+)([smhd])$/);
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(m[1]);
    const multipliers: Record<string, number> = {
      s: 1e3,
      m: 6e4,
      h: 36e5,
      d: 864e5,
    };
    return n * (multipliers[m[2]] ?? 864e5);
  }
}

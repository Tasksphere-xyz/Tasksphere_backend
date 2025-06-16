/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('workspace_message')
export class WorkspaceMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sender_email: string;

  @Column()
  workspace_id: number;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ nullable: true })
  fileUrl?: string;

  @Column({ nullable: false, default: false })
  isPinned: boolean;

  @Column({ nullable: true })
  pinExpiresAt: Date;

  @CreateDateColumn()
  created_at: Date;
}

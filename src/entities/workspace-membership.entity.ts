/* eslint-disable prettier/prettier */
// src/entities/workspace-membership.entity.ts (Previously project-membership.entity.ts)
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity('workspace_membership')
export class WorkspaceMembership {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspace_id: number;

  // // Define the ManyToOne relationship to Workspace
  // @ManyToOne(() => Workspace, workspace => workspace.memberships)
  // @JoinColumn({ name: 'workspace_id' })
  // workspace: Workspace;
  
  @Column()
  email: string;

  @Column({ nullable: true })
  status: 'pending' | 'accepted' | 'declined';

  @Column({ nullable: true })
  role: 'admin' | 'member' | 'owner';

  @CreateDateColumn({ nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ nullable: false })
  updatedAt: Date;
}
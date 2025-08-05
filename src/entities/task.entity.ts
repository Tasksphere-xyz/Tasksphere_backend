/* eslint-disable prettier/prettier */
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

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  workspace_id: number;

  @Column({ nullable: true })
  contractId?: string;

  @Column({ nullable: true })
  taskContractId?: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace;

  @Column()
  title: string;

  @Column()
  status: 'pending' | 'in-progress' | 'completed';

  @Column()
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  assigned_to?: number; // User assigned to the task

  @Column({ nullable: true })
  attachment?: string;

  @CreateDateColumn({ nullable: true })
  start_date: Date;

  @CreateDateColumn({ nullable: true })
  due_date: Date;

  @CreateDateColumn({ nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ nullable: false })
  updatedAt: Date;
}
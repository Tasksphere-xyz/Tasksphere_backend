import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum NotificationType {
  ASSIGNED_TASK = 'ASSIGNED_TASK',
  MENTION = 'MENTION',
  TASK_DEADLINE = 'TASK_DEADLINE',
  NEW_MEMBER = 'NEW_MEMBER',
  NEW_MESSAGE = 'NEW_MESSAGE',
}

@Entity('notification')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json', nullable: false })
  sendTo: string[];

  @Column({ type: 'enum', enum: NotificationType, nullable: false })
  type: NotificationType;

  @Column({ type: 'text', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

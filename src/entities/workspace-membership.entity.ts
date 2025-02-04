/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('workspace_membership')
  export class WorkspaceMembership {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    workspace_id: number;

    @Column()
    email: string;
  
    @Column({ nullable: true })
    status: 'pending' | 'accepted' | 'declined';

    @Column({ nullable: true })
    role: 'admin' | 'member';
  
    @CreateDateColumn({ nullable: false })
    invited_at: Date;
  
    @CreateDateColumn({ nullable: false })
    createdAt: Date;
  
    @UpdateDateColumn({ nullable: false })
    updatedAt: Date;
}
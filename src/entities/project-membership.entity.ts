/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('project_membership')
  export class ProjectMembership {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    project_id: number;

    @Column()
    email: string;
  
    @Column({ nullable: true })
    status: 'pending' | 'accepted' | 'declined';

    @Column({ nullable: true })
    role: 'admin' | 'member' | 'owner';
  
    @CreateDateColumn({ nullable: false })
    invited_at: Date;
  
    @CreateDateColumn({ nullable: false })
    createdAt: Date;
  
    @UpdateDateColumn({ nullable: false })
    updatedAt: Date;
}
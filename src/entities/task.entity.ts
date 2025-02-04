/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('tasks')
  export class Task {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    user_id: number;
  
    @Column()
    title: string;
  
    @Column()
    status: 'pending' | 'in-progress' | 'completed';

    @Column()
    priority: 'low' | 'medium' | 'high' | 'urgent';
  
    @Column({ nullable: true })
    assigned_to?: string;

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
  
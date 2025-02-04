/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('projects')
  export class Project {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    project_name: string;
  
    @Column({ nullable: true })
    description?: string;
  
    @CreateDateColumn({ nullable: false })
    createdAt: Date;
  
    @UpdateDateColumn({ nullable: false })
    updatedAt: Date;
}
  
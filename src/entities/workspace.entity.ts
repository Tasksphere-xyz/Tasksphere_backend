/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  @Entity('workspaces')
  export class Workspace {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column()
    project_id: number;
  
    @Column()
    workspace_name: string;
  
    @CreateDateColumn({ nullable: false })
    createdAt: Date;
  
    @UpdateDateColumn({ nullable: false })
    updatedAt: Date;
}
  
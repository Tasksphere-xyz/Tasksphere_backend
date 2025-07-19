import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  username: string;

  @Column({ nullable: true })
  displayPic: string;

  @Column({ nullable: true })
  googleId: string;

  @Column({ nullable: true })
  wallet_address?: string;

  @Column({ nullable: true })
  password: string;

  @CreateDateColumn({ nullable: false })
  createdAt: Date;

  @UpdateDateColumn({ nullable: false })
  updatedAt: Date;
}

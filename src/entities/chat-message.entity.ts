/* eslint-disable prettier/prettier */
import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn
} from 'typeorm';

@Entity('chat_messages')
export class ChatMessage {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    sender_email: string;

    @Column()
    receiver_email: string;

    @Column()
    project_id: number;

    @Column({ type: 'text', nullable: true })
    message?: string;

    @Column({ nullable: true })
    fileUrl?: string;

    @Column({ default: false })
    is_read: boolean;

    @CreateDateColumn()
    createdAt: Date;
}

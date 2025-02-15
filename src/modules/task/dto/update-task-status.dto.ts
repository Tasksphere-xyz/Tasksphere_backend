import { IsEnum } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsEnum(['pending', 'in-progress', 'completed'], {
    message: 'Status must be either pending, in-progress, or completed',
  })
  status: 'pending' | 'in-progress' | 'completed';
}

import { Inject, Injectable } from '@nestjs/common';
import { TaskQueue } from '../gcloud/tasks';
import { Configuration, CONFIGURATION } from '../configuration';

@Injectable()
export class AuthTaskService extends TaskQueue<Configuration> {
  constructor(@Inject(CONFIGURATION) private readonly configuration: Configuration) {
    super(configuration, 'default');
  }

  queueActivationEmail(inviteId: string, email: string) {
    return this.enqueue('auth/activation-email', { inviteId, email });
  }

  queuePasswordResetEmail(resetId: string, email: string) {
    return this.enqueue('auth/password-reset-email', { resetId, email });
  }
}

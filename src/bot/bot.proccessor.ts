import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('reminder')
export class TestProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log('jpb', job);
    // const { userId, message } = job.data;
    return await new Promise((resolve) => resolve('resolve promise'));
  }

  @OnWorkerEvent('completed')
  onCompleted() {
    console.log('on complete');
    // do some stuff
  }
}

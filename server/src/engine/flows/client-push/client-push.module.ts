import { Module } from '@nestjs/common';
import { FabricsModule } from '../../../fabrics/fabrics.module';
import { SseConnectionManager } from './sse-connection-manager.service';
import { FlowEventBridge } from './flow-event-bridge.service';
import { SseKeepaliveScheduler } from './sse-keepalive-scheduler.service';

@Module({
  imports: [FabricsModule],
  providers: [SseConnectionManager, FlowEventBridge, SseKeepaliveScheduler],
  exports: [SseConnectionManager, FlowEventBridge, SseKeepaliveScheduler],
})
export class ClientPushModule {}

import { Module } from '@nestjs/common';
import { RealTimeGateway } from './real-time.gateway';

@Module({
  providers: [RealTimeGateway],
  exports: [RealTimeGateway],
})
export class RealTimeModule {}

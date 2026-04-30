export interface ITimeBlock {
  id: string;
  userId: string;
  taskId?: string;
  startTime: Date;
  endTime: Date;
  blockType: 'Focus_Block' | 'Break' | 'External_Event';
  externalEventId?: string;
  source: 'App' | 'Google' | 'Outlook';
  isLocked: boolean;
  createdAt: Date;
}

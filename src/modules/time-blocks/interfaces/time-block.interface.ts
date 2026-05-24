export interface ITimeBlock {
  id: string;
  userId: string;
  taskId?: string;
  startTime: Date;
  endTime: Date;
  blockType: 'Focus_Block' | 'Break' | 'External_Event' | 'Meeting';
  externalEventId?: string;
  source: 'App' | 'Google' | 'Outlook';
  isLocked: boolean;
  title: string;
  meetingUrl?: string;
  attendees?: Array<{ email: string; responseStatus?: string; name?: string }>;
  createdAt: Date;
}

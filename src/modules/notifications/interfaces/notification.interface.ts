export interface INotification {
  id: string;
  userId: string;
  relatedTaskId?: string;
  type: string;
  scheduledAt: Date;
  status: 'Pending' | 'Sent' | 'Read';
  title: string;
  body: string;
  createdAt: Date;
}

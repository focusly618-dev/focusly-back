export interface IFocusSession {
  id: string;
  userId: string;
  taskId: string;
  startedAt: Date;
  endedAt: Date;
  durationMinutes: number;
  distractionCount: number;
  wasSuccessful: boolean;
}

import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';

const mapGoogleColorToPriority = (colorId?: string): number => {
  if (!colorId) return 1; // Default to Low priority

  const priorityMap: Record<string, number> = {
    '11': 3,
    '4': 3,
    '6': 3,
    '3': 3,

    '5': 2,
    '9': 2,
    '7': 2,
    '2': 2,

    '1': 1,
    '10': 1,
    '8': 1,
  };

  return priorityMap[colorId] || 1;
};

export const BasicMappingStage = (event: GoogleEvent): ProcessedGoogleTask => {
  const isAllDay = !!event.start?.date;
  const start = event.start?.dateTime
    ? new Date(event.start.dateTime)
    : event.start?.date
      ? new Date(event.start.date)
      : new Date();

  const deadline = event.end?.dateTime
    ? new Date(event.end.dateTime)
    : event.end?.date
      ? new Date(event.end.date)
      : new Date(start.getTime() + 30 * 60000);

  return {
    id: event.id || '',
    google_event_id: event.id,
    title: event.summary || 'Sin título',
    notes_encrypted: event.description || '',
    deadline: deadline.toISOString(),
    estimated_start_date: start.toISOString(),
    estimated_end_date: deadline.toISOString(),
    status: 'Scheduled',
    priority_level: mapGoogleColorToPriority(event.colorId),
    subtasks: [],
    tags: [],
    links: [],
    estimate_timer: Math.round((deadline.getTime() - start.getTime()) / 60000),
    task_type: 'GoogleTask',
    is_all_day: isAllDay,
    location: event.location,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

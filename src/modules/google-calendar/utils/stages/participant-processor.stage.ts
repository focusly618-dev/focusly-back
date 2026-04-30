import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';

export const ParticipantProcessorStage = (
  event: GoogleEvent,
  task: ProcessedGoogleTask,
): ProcessedGoogleTask => {
  const hasMeetLink = task.links.some(
    (link) =>
      link.title === 'Google Meet' || link.url.includes('meet.google.com'),
  );

  if (hasMeetLink && event.attendees && event.attendees.length > 0) {
    task.collaborators = event.attendees
      .filter((attendee) => !!attendee.email)
      .map((attendee) => {
        const email = attendee.email || '';
        const name = attendee.displayName || email.split('@')[0] || '';

        return {
          name,
          email,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=128`,
        };
      });
  } else {
    task.collaborators = [];
  }

  task.organizer_email = event.organizer?.email;

  return task;
};

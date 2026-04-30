import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../../interfaces/google-calendar.interfaces';

export const MeetingExtractorStage = (
  event: GoogleEvent,
  task: ProcessedGoogleTask,
): ProcessedGoogleTask => {
  // Extract main call link
  const conferenceLink = event.conferenceData?.entryPoints?.find(
    (ep) => ep.entryPointType === 'video',
  )?.uri;

  const callLink = event.hangoutLink || conferenceLink;

  if (callLink) {
    const isGoogleMeet = callLink.includes('meet.google.com');
    task.links.push({
      title: isGoogleMeet ? 'Google Meet' : 'Enlace de Reunión',
      url: callLink,
    });
  }

  // Also look for links in description if notes were not cleaned yet or separately
  // (Optional: can add regex to find other meeting links like Zoom, Teams)

  return task;
};

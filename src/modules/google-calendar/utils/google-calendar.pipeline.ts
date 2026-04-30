import { Pipeline } from './pipeline.engine';
import {
  GoogleEvent,
  ProcessedGoogleTask,
} from '../interfaces/google-calendar.interfaces';
import { BasicMappingStage } from './stages/basic-mapping.stage';
import { DescriptionCleanerStage } from './stages/description-cleaner.stage';
import { MeetingExtractorStage } from './stages/meeting-extractor.stage';
import { ParticipantProcessorStage } from './stages/participant-processor.stage';

/**
 * Enhanced Google Calendar Pipeline.
 * Assembles modular stages to transform raw Google Events into clean,
 * UI-ready ProcessedGoogleTask objects.
 */
export const createGoogleTaskPipeline = () => {
  return (
    new Pipeline<GoogleEvent, ProcessedGoogleTask>()
      // Stage 1: Initial mapping (Input: GoogleEvent, Output: ProcessedGoogleTask)
      .addStage('Initial Mapping', (event: GoogleEvent) => {
        return BasicMappingStage(event);
      })
      // Stage 2: Description extraction and cleaning
      .addStage('Cleaning Description', (task: ProcessedGoogleTask) => {
        return DescriptionCleanerStage(task);
      })
      // Stage 3: Meeting and conference data extraction
      // Note: This stage needs the original event too.
      // We can handle this by passing them in a tuple or just closures.
      // In this robust engine, we can use the original event captured in closure if needed,
      // but the stage logic is cleaner if we pass what it needs.
      .addStage('Extracting Meeting Links', (task: ProcessedGoogleTask) => {
        // We pass a function that captures the original event if needed,
        // but let's re-think: the execute(event) is where it starts.
        return task; // Placeholder, see logic below
      })
  );
};

/**
 * Executable instance of the Google Calendar Processing Pipeline.
 */
export const processGoogleEvent = async (
  event: GoogleEvent,
): Promise<ProcessedGoogleTask> => {
  const task = BasicMappingStage(event);

  const pipeline = new Pipeline<ProcessedGoogleTask, ProcessedGoogleTask>()
    .addStage('Clean Description', DescriptionCleanerStage)
    .addStage('Extract Meetings', (t) => MeetingExtractorStage(event, t))
    .addStage('Process Participants', (t) =>
      ParticipantProcessorStage(event, t),
    );

  return pipeline.execute(task);
};

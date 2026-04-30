/**
 * A robust, modular Pipeline engine to process data through a series of stages.
 * Supports synchronous and asynchronous stages, error handling, and type safety.
 */
export class Pipeline<TInput, TOutput> {
  private readonly stages: Array<{
    name: string;
    execute: (input: unknown) => unknown;
  }> = [];

  /**
   * Adds a processing stage to the pipeline.
   * @param name - A descriptive name for the stage (useful for debugging).
   * @param stageFn - The function that transforms the data.
   */
  addStage<TNext>(
    name: string,
    stageFn: (input: TOutput) => TNext | Promise<TNext>,
  ): Pipeline<TInput, TNext> {
    this.stages.push({ name, execute: stageFn as (input: unknown) => unknown });
    return this as unknown as Pipeline<TInput, TNext>;
  }

  /**
   * Executes the pipeline with the given input.
   * @param input - The initial data to process.
   */
  async execute(input: TInput): Promise<TOutput> {
    let result: unknown = input;

    for (const stage of this.stages) {
      try {
        result = await stage.execute(result);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error in pipeline stage "${stage.name}":`, error);
        // We throw a more descriptive error but preserve the original cause
        throw new Error(
          `Pipeline failed at stage "${stage.name}": ${errorMessage}`,
        );
      }
    }

    return result as TOutput;
  }
}

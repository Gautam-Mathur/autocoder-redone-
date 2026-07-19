// config/data/modules/feature-1/WorkoutLogging.ts

export class WorkoutLogging {
  private readonly logger = console.log; // Logger instance for outputting data to the console

  constructor(private moduleName: string, private featureId: number) {} // Constructor with parameters for logging features and their respective modules

  logWorkout(): void {
    const date = new Date(); // Create a new Date object representing current time
    const formattedDate = `${date.toLocaleString()} - Logging Feature ID: ${this.featureId}`; // Format the date string with feature ID for logging context
    this.logger(`${formattedDate} - Module Name: ${this.moduleName}`); // Log the formatted date and module name to console
  }
}
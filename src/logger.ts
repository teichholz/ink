import pino from "pino";
import path from "node:path";

// Get the current log level from environment
// biome-ignore lint/complexity/useLiteralKeys: env must be an index access
const logLevel = process.env["LOG_LEVEL"] || "info";

// Create a combined destination for all logs
const allLogsDestination = pino.destination({
	dest: path.join(process.cwd(), "int.log"),
	sync: false,
});

// Create an error-only destination
const errorLogsDestination = pino.destination({
	dest: path.join(process.cwd(), "int.errors.log"),
	sync: false,
});

// Create a multi-destination stream
const multiDestinationStream = pino.multistream([
	{ stream: allLogsDestination },
	{
		stream: errorLogsDestination,
		level: "error",
	},
]);

// Create the logger instance
export const logger = pino.default(
	{
		level: logLevel,
		timestamp: pino.stdTimeFunctions.isoTime,
	},
	multiDestinationStream,
);

// Make sure to flush logs on exit
process.on("exit", () => {
	allLogsDestination.flushSync();
	errorLogsDestination.flushSync();
});

// Handle unexpected termination
process.on("uncaughtException", (err) => {
	logger.fatal(err, "Uncaught exception");
	allLogsDestination.flushSync();
	errorLogsDestination.flushSync();
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	logger.fatal({ reason }, "Unhandled rejection");
	allLogsDestination.flushSync();
	errorLogsDestination.flushSync();
	process.exit(1);
});

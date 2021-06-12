import { processEnv } from "./processEnv";

const logLevelMap = new Map([['ERROR', 1], ['WARN', 2], ['INFO', 3], ['DEBUG', 4], ['TRACE', 5],]);
const maxLogLevel = logLevelMap.get(processEnv.LogLevel);

const putLog = (log: any, logLevel: number, logger: (log: any) => void) => {

  if (maxLogLevel && logLevel <= maxLogLevel) logger(log);

}

const error = (log: any) => putLog(log, 1, console.error);
const warn = (log: any) => putLog(log, 2, console.warn);
const info = (log: any) => putLog(log, 3, console.info);
const debug = (log: any) => putLog(log, 4, console.debug);
const trace = (log: any) => putLog(log, 5, console.trace);

export const appLogger = { error, warn, info, debug, trace };

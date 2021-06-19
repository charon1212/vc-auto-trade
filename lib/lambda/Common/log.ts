import { processEnv } from "./processEnv";

export type VCATLogLevel = 'ERROR' | 'WARN' | 'INFO1' | 'INFO2' | 'INFO3' | 'INFO' | 'DEBUG' | 'TRACE';
const logLevelMap: Map<VCATLogLevel, number> = new Map([['ERROR', 1], ['WARN', 2], ['INFO1', 3], ['INFO2', 4], ['INFO3', 5], ['INFO', 5], ['DEBUG', 6], ['TRACE', 7],]);
const maxLogLevel = logLevelMap.get(processEnv.LogLevel);

const putLog = (log: any, logLevel: number, logger: (log: any) => void) => {

  if (maxLogLevel && logLevel <= maxLogLevel) logger(log);

}

const error = (log: any) => putLog(log, 1, console.error);
const warn = (log: any) => putLog(log, 2, console.warn);
const info1 = (log: any) => putLog(log, 3, console.info);
const info2 = (log: any) => putLog(log, 4, console.info);
const info3 = (log: any) => putLog(log, 5, console.info);
const debug = (log: any) => putLog(log, 6, console.debug);
const trace = (log: any) => putLog(log, 7, console.trace);

export const appLogger = { error, warn, info1, info2, info3, debug, trace };

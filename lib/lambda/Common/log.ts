import { processEnv } from "./processEnv";

const logLevelMap = new Map([['ERROR', 1], ['WARN', 2], ['INFO', 3], ['DEBUG', 4], ['TRACE', 5],]);
const maxLogLevel = logLevelMap.get(processEnv.LogLevel);

const putLog = (log: any, putProduction: boolean, logLevel: number, logger: (log: any) => void) => {

  if (!putProduction && processEnv.EnvName === 'production') return;
  if (maxLogLevel && logLevel <= maxLogLevel) {
    logger(log);
    if (logLevel === 1) {
      console.trace(); // エラーログの場合のみ、スタックトレースを追記
    }
  }

}

const error = (log: any) => putLog(log, true, 1, console.error);
const warn = (log: any) => putLog(log, false, 2, console.warn);
const info = (log: any) => putLog(log, false, 3, console.info);
const debug = (log: any) => putLog(log, false, 4, console.debug);
const trace = (log: any) => putLog(log, false, 5, console.trace);

export const appLogger = { error, warn, info, debug, trace };

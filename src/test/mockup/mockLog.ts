import { appLogger } from "../../lib/lambda/Common/log";

export const mockLog = () => {
  const mockLogError = jest.spyOn(appLogger, 'error').mockImplementation();
  const mockLogWarn = jest.spyOn(appLogger, 'warn').mockImplementation();
  const mockLogInfo1 = jest.spyOn(appLogger, 'info1').mockImplementation();
  const mockLogInfo2 = jest.spyOn(appLogger, 'info2').mockImplementation();
  const mockLogInfo3 = jest.spyOn(appLogger, 'info3').mockImplementation();
  const mockLogDebug = jest.spyOn(appLogger, 'debug').mockImplementation();
  const mockLogTrace = jest.spyOn(appLogger, 'trace').mockImplementation();
  return { mockLogError, mockLogWarn, mockLogInfo1, mockLogInfo2, mockLogInfo3, mockLogDebug, mockLogTrace, };
};

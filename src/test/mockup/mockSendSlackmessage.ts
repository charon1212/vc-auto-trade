import * as sendSlackMessageModule from "../../lib/lambda/Interfaces/Slack/sendSlackMessage";

export const mockSendSlackMessage = () => {
  const mock = jest.spyOn(sendSlackMessageModule, 'sendSlackMessage').mockImplementation();
  return mock;
};
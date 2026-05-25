export interface SQSEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface LambdaSQSEvent {
  Records: Array<{
    messageId: string;
    body: string;
    attributes: Record<string, string>;
  }>;
}

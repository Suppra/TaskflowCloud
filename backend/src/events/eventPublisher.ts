import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqs } from '../config/aws';
import { env } from '../config/env';
import { SQSEvent } from '../types';
import { logger } from '../config/logger';

export const eventPublisher = {
  async publish(event: SQSEvent): Promise<void> {
    if (!env.SQS_QUEUE_URL) {
      logger.warn({ message: 'SQS_QUEUE_URL not configured, skipping event', event });
      return;
    }

    try {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify(event),
          MessageAttributes: {
            eventType: {
              DataType: 'String',
              StringValue: event.type,
            },
          },
        })
      );
      logger.debug({ message: 'Event published', type: event.type });
    } catch (err) {
      logger.error({ message: 'Failed to publish event', event, error: err });
    }
  },
};

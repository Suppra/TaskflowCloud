import { SubscribeCommand } from '@aws-sdk/client-sns';
import { sns } from '../config/aws';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const emailSubscriptionService = {
  async ensureSubscribed(email: string): Promise<void> {
    const topicArn = env.USER_NOTIFICATIONS_TOPIC_ARN;
    if (!topicArn) {
      logger.warn('USER_NOTIFICATIONS_TOPIC_ARN is not set; skipping SNS subscribe');
      return;
    }

    try {
      logger.info(`Requesting SNS email subscription for ${email} in topic ${topicArn}`);
      await sns.send(
        new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: email,
          Attributes: {
            // Solo recibira mensajes cuyo atributo recipient coincida con su email.
            FilterPolicy: JSON.stringify({ recipient: [email] }),
          },
          ReturnSubscriptionArn: true,
        })
      );

      logger.info(`SNS email subscription requested (pending confirmation by user): ${email}`);
    } catch (error) {
      // No debe bloquear el registro si SNS no esta disponible.
      logger.warn(`Could not request SNS email subscription for ${email}: ${String(error)}`);
    }
  },
};

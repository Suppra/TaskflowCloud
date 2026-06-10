import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SESClient } from '@aws-sdk/client-ses';
import { SNSClient } from '@aws-sdk/client-sns';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { env } from './env';

const awsConfig = {
  region: env.AWS_REGION,
  ...(env.AWS_ACCESS_KEY_ID && {
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  }),
};

const dynamoBaseClient = new DynamoDBClient({
  ...awsConfig,
  ...(env.DYNAMODB_ENDPOINT && { endpoint: env.DYNAMODB_ENDPOINT }),
});

export const dynamoDB = DynamoDBDocumentClient.from(dynamoBaseClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const s3 = new S3Client(awsConfig);
export const sqs = new SQSClient(awsConfig);
export const ses = new SESClient(awsConfig);
export const sns = new SNSClient(awsConfig);
export const secretsManager = new SecretsManagerClient(awsConfig);

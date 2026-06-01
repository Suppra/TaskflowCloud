import { PutCommand, QueryCommand, GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDB } from '../config/aws';
import { Report } from '../types';

const TABLE = 'taskflow-reports';

export const reportRepository = {
  async create(report: Report): Promise<Report> {
    await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: report }));
    return report;
  },

  async findByProject(projectId: string): Promise<Report[]> {
    const items: Report[] = [];
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await dynamoDB.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: 'projectId-index',
          KeyConditionExpression: 'projectId = :projectId',
          ExpressionAttributeValues: { ':projectId': projectId },
          ScanIndexForward: false,
          ExclusiveStartKey: lastKey,
        })
      );
      items.push(...((result.Items ?? []) as Report[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
    return items;
  },

  async findById(reportId: string): Promise<Report | null> {
    const result = await dynamoDB.send(
      new GetCommand({ TableName: TABLE, Key: { reportId } })
    );
    return (result.Item as Report) ?? null;
  },

  async delete(reportId: string): Promise<void> {
    await dynamoDB.send(new DeleteCommand({ TableName: TABLE, Key: { reportId } }));
  },
};

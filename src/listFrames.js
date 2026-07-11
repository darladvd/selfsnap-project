import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async () => {
  const tableName = process.env.DDB_TABLE_NAME;
  const cfDomain = process.env.CLOUDFRONT_DOMAIN;

  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "gsi1pk = :pk",
      ExpressionAttributeValues: {
        ":pk": "FRAME#ACTIVE",
      },
      ScanIndexForward: false,
    })
  );

  const frames = (result.Items || []).map((item) => ({
    name: item.name,
    s3Key: item.s3Key,
    url: `https://${cfDomain}/${item.s3Key}`,
    createdAt: item.createdAt,
  }));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ frames }),
  };
};

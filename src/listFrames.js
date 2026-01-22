import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async () => {
    const tableName = process.env.DDB_TABLE_NAME;
    const cfDomain = process.env.CLOUDFRONT_DOMAIN;

    const resp = await ddb.send(
        new QueryCommand({
        TableName: tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "gsi1pk = :pk",
        ExpressionAttributeValues: {
            ":pk": "FRAME#ACTIVE",
        },
        // Optional: newest first if your gsi1sk starts with timestamp
        ScanIndexForward: false,
        })
    );

    const items = (resp.Items || []).map((it) => ({
        s3Key: it.s3Key,
        name: it.name ?? null,
        createdAt: it.createdAt ?? null,
        url: `https://${cfDomain}/${it.s3Key}`,
    }));

    return {
        statusCode: 200,
        headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
        },
        body: JSON.stringify({ frames: items }),
    };
};

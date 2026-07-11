import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

export const handler = async (event) => {
  const bucket = process.env.PHOTOS_BUCKET_NAME;

  const body = JSON.parse(event.body || "{}");
  const type = body.type; // "screen" or "print"

  if (!type || !["screen", "print"].includes(type)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "type must be 'screen' or 'print'" }),
    };
  }

  // Date folder: YYYY-MM-DD
  const now = new Date();
  const dateFolder = now.toISOString().slice(0, 10);

  // Unique filename using timestamp
  const ts = now.toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const key = `${dateFolder}/${type}/selfsnap-${ts}.png`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "image/png",
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 120 });

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ url, key }),
  };
};

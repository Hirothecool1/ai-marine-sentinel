import { BigQuery } from '@google-cloud/bigquery';
import { Storage } from '@google-cloud/storage';
import { GoogleGenAI } from '@google/genai';

const projectId = process.env.GOOGLE_CLOUD_PROJECT;

// Initialize BigQuery Client
export const bigquery = new BigQuery({
  projectId: projectId,
});

// Initialize Cloud Storage Client
export const storage = new Storage({
  projectId: projectId,
});

// Initialize Vertex AI Gemini Client
// Requires GOOGLE_GENAI_USE_VERTEXAI=TRUE and GOOGLE_CLOUD_LOCATION in env
export const ai = new GoogleGenAI({});

export const bqTableId = process.env.BIGQUERY_TABLE || '';
export const bucketName = process.env.GCS_BUCKET_NAME || '';

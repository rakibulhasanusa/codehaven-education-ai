import { Pinecone } from "@pinecone-database/pinecone";

function pineconeIndex(namespace?: string) {
  const apiKey = process.env.PINECONE_API_KEY;
  const index = process.env.PINECONE_INDEX_NAME;
  if (!apiKey || !index) {
    throw new Error("Missing PINECONE_API_KEY or PINECONE_INDEX_NAME");
  }
  const client = new Pinecone({ apiKey });
  return client
    .index(index)
    .namespace(namespace || process.env.PINECONE_NAMESPACE || "mcq");
}

export async function upsertQuestionVector(input: {
  id: string;
  values: number[];
  metadata: Record<string, string | number | boolean>;
  namespace?: string;
}) {
  await pineconeIndex(input.namespace).upsert({
    records: [{ id: input.id, values: input.values, metadata: input.metadata }],
  });
}

export async function upsertQuestionVectors(
  records: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string | number | boolean>;
  }>,
  namespace?: string
) {
  if (records.length === 0) return;
  await pineconeIndex(namespace).upsert({ records });
}

export async function querySimilarVectors(values: number[], topK = 3, filter?: Record<string, unknown>) {
  const result = await pineconeIndex().query({
    vector: values,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
  return result.matches ?? [];
}

export async function deleteVectorById(id: string) {
  await pineconeIndex().deleteOne({ id });
}

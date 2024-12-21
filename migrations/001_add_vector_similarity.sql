-- Enable the vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector similarity operators
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector) 
RETURNS float
AS $$
  SELECT (a <=> b)::float;
$$ LANGUAGE SQL IMMUTABLE STRICT PARALLEL SAFE;

-- Create or update facts table with vector support
CREATE TABLE IF NOT EXISTS facts (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  embedding vector(1536),
  emotional_impact JSONB NOT NULL,
  weight FLOAT NOT NULL DEFAULT 0
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS facts_embedding_idx ON facts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar facts
CREATE OR REPLACE FUNCTION find_similar_facts(
  query_embedding vector(1536),
  similarity_threshold float,
  max_results integer
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  source TEXT,
  timestamp TIMESTAMPTZ,
  embedding vector(1536),
  emotional_impact JSONB,
  weight FLOAT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.*,
    1 - (f.embedding <=> query_embedding) as similarity
  FROM facts f
  WHERE f.embedding IS NOT NULL
    AND 1 - (f.embedding <=> query_embedding) > similarity_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT max_results;
END;
$$; 
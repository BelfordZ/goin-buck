-- Add vector similarity index
create index if not exists idx_facts_embedding on public.facts using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Function to find similar facts based on embedding similarity
create or replace function public.find_similar_facts(
    query_embedding vector(1536),
    similarity_threshold float,
    max_results int
)
returns table (
    id text,
    content text,
    source text,
    fact_timestamp timestamptz,
    embedding vector(1536),
    emotional_impact jsonb,
    weight float,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        f.id,
        f.content,
        f.source,
        f.timestamp::timestamptz as fact_timestamp,
        f.embedding,
        f.emotional_impact,
        f.weight,
        1 - (f.embedding <=> query_embedding) as similarity
    from public.facts f
    where f.embedding is not null
    and 1 - (f.embedding <=> query_embedding) > similarity_threshold
    order by f.embedding <=> query_embedding
    limit max_results;
end;
$$; 
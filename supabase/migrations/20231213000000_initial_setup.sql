-- Enable the vector extension for similarity search
create extension if not exists vector;

-- Create the facts table for storing processed inputs
create table if not exists public.facts (
    id text primary key,
    content text not null,
    source text not null,
    timestamp timestamp with time zone not null,
    embedding vector(1536), -- OpenAI embeddings are 1536 dimensions
    emotional_impact jsonb not null,
    weight float not null,
    created_at timestamp with time zone default now()
);

-- Create the patterns table for long-term memory
create table if not exists public.patterns (
    id text primary key,
    facts text[] not null,
    weight float not null,
    emotional_signature jsonb not null,
    last_accessed timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index if not exists idx_facts_source on public.facts(source);
create index if not exists idx_facts_timestamp on public.facts(timestamp);
create index if not exists idx_patterns_weight on public.patterns(weight);
create index if not exists idx_patterns_last_accessed on public.patterns(last_accessed);

-- Function to match patterns based on embedding similarity
create or replace function public.match_patterns(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
returns table (
    id text,
    facts text[],
    weight float,
    emotional_signature jsonb,
    last_accessed timestamp with time zone,
    similarity float
)
language plpgsql
as $$
begin
    return query
    select
        p.id,
        p.facts,
        p.weight,
        p.emotional_signature,
        p.last_accessed,
        -- Calculate average similarity across all facts in the pattern
        (
            select avg((f.embedding <=> query_embedding)::float)
            from public.facts f
            where f.id = any(p.facts)
        ) as similarity
    from public.patterns p
    where exists (
        select 1
        from public.facts f
        where f.id = any(p.facts)
        and (f.embedding <=> query_embedding) < match_threshold
    )
    order by similarity asc
    limit match_count;
end;
$$; 
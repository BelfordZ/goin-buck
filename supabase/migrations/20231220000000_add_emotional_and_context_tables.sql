-- Add emotional states table to track system state over time
create table if not exists public.emotional_states (
    id text primary key,
    quadrant jsonb not null,
    intensity float not null,
    timestamp timestamp with time zone not null,
    source_facts text[] not null,
    created_at timestamp with time zone default now()
);

-- Add context history table to track context changes
create table if not exists public.context_history (
    id text primary key,
    context_type text not null,
    recent_facts text[] not null,
    contextual_memory text[] not null,
    emotional_state text references public.emotional_states(id),
    timestamp timestamp with time zone not null,
    metrics jsonb not null, -- hits, misses, evictions, avg_access_time
    created_at timestamp with time zone default now()
);

-- Add cross-context patterns table for patterns across input types
create table if not exists public.cross_context_patterns (
    id text primary key,
    source_patterns text[] not null,
    source_contexts text[] not null,
    weight float not null,
    emotional_signature jsonb not null,
    confidence float not null,
    last_accessed timestamp with time zone not null,
    created_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index if not exists idx_emotional_states_timestamp on public.emotional_states(timestamp);
create index if not exists idx_context_history_type on public.context_history(context_type);
create index if not exists idx_context_history_timestamp on public.context_history(timestamp);
create index if not exists idx_cross_context_patterns_weight on public.cross_context_patterns(weight);
create index if not exists idx_cross_context_patterns_last_accessed on public.cross_context_patterns(last_accessed);

-- Function to analyze emotional state changes over time
create or replace function public.analyze_emotional_trend(
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    context_type text default null
)
returns table (
    time_slice timestamp with time zone,
    avg_intensity float,
    dominant_quadrant text,
    context_correlation float
)
language plpgsql
as $$
begin
    return query
    with time_slices as (
        select
            date_trunc('hour', timestamp) as slice,
            avg(intensity) as intensity,
            jsonb_object_keys(quadrant) as quadrant_key,
            avg((quadrant->>jsonb_object_keys(quadrant))::float) as quadrant_value
        from public.emotional_states e
        where timestamp between start_time and end_time
        and (
            context_type is null
            or exists (
                select 1 from public.context_history c
                where c.emotional_state = e.id
                and c.context_type = context_type
            )
        )
        group by slice, jsonb_object_keys(quadrant)
    )
    select
        slice as time_slice,
        avg(intensity) as avg_intensity,
        (
            select quadrant_key
            from time_slices t2
            where t2.slice = t1.slice
            order by quadrant_value desc
            limit 1
        ) as dominant_quadrant,
        corr(intensity, quadrant_value) as context_correlation
    from time_slices t1
    group by slice
    order by slice;
end;
$$;

-- Function to find cross-context patterns
create or replace function public.find_cross_context_patterns(
    context_types text[],
    time_window interval,
    similarity_threshold float
)
returns table (
    pattern_id text,
    source_patterns text[],
    contexts text[],
    combined_weight float,
    emotional_signature jsonb
)
language plpgsql
as $$
declare
    debug_info jsonb;
begin
    -- Log input parameters
    debug_info := jsonb_build_object(
        'context_types', context_types,
        'time_window', time_window,
        'similarity_threshold', similarity_threshold
    );
    raise notice 'Starting find_cross_context_patterns with params: %', debug_info;

    return query
    with relevant_contexts as (
        select
            c.id,
            c.context_type,
            c.recent_facts,
            e.quadrant as emotional_state
        from public.context_history c
        join public.emotional_states e on c.emotional_state = e.id
        where c.context_type = any(context_types)
        and c.timestamp > now() - time_window
    ),
    pattern_candidates as (
        select
            p1.id as pattern1_id,
            p2.id as pattern2_id,
            rc1.context_type as context1,
            rc2.context_type as context2,
            (
                select avg((f1.embedding <=> f2.embedding)::float)
                from unnest(p1.facts) f1_id
                cross join unnest(p2.facts) f2_id
                join public.facts f1 on f1.id = f1_id
                join public.facts f2 on f2.id = f2_id
            ) as similarity,
            (p1.weight + p2.weight) / 2.0 as pattern_weight,
            jsonb_build_object(
                'joy', (p1.emotional_signature->>'joy')::float * 0.5 + (p2.emotional_signature->>'joy')::float * 0.5,
                'calm', (p1.emotional_signature->>'calm')::float * 0.5 + (p2.emotional_signature->>'calm')::float * 0.5,
                'anger', (p1.emotional_signature->>'anger')::float * 0.5 + (p2.emotional_signature->>'anger')::float * 0.5,
                'sadness', (p1.emotional_signature->>'sadness')::float * 0.5 + (p2.emotional_signature->>'sadness')::float * 0.5
            ) as merged_emotional_signature
        from public.patterns p1
        cross join public.patterns p2
        join relevant_contexts rc1 on p1.facts && rc1.recent_facts
        join relevant_contexts rc2 on p2.facts && rc2.recent_facts
        where p1.id < p2.id
        and rc1.context_type < rc2.context_type
    )
    select
        gen_random_uuid()::text as pattern_id,
        array[pc.pattern1_id, pc.pattern2_id] as source_patterns,
        array[pc.context1, pc.context2] as contexts,
        pc.pattern_weight as combined_weight,
        pc.merged_emotional_signature as emotional_signature
    from pattern_candidates pc
    where pc.similarity <= similarity_threshold
    order by pc.pattern_weight desc;

    -- Log completion
    raise notice 'Completed find_cross_context_patterns';
end;
$$; 
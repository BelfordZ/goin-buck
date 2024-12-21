-- Function to update emotional state and return trend analysis
create or replace function public.update_emotional_state(
    new_quadrant jsonb,
    new_intensity float,
    source_fact_ids text[],
    lookback_hours int default 24
)
returns table (
    state_id text,
    trend_analysis jsonb
)
language plpgsql
as $$
declare
    new_state_id text;
begin
    -- Insert new emotional state
    new_state_id := gen_random_uuid()::text;
    
    insert into public.emotional_states (
        id,
        quadrant,
        intensity,
        timestamp,
        source_facts
    ) values (
        new_state_id,
        new_quadrant,
        new_intensity,
        now(),
        source_fact_ids
    );

    -- Analyze trend
    return query
    select
        new_state_id,
        jsonb_build_object(
            'time_window', lookback_hours || ' hours',
            'trends', (
                select jsonb_agg(
                    jsonb_build_object(
                        'time_slice', time_slice,
                        'intensity', avg_intensity,
                        'dominant_emotion', dominant_quadrant,
                        'context_impact', context_correlation
                    )
                )
                from analyze_emotional_trend(
                    now() - (lookback_hours || ' hours')::interval,
                    now()
                )
            )
        ) as trend_analysis;
end;
$$;

-- Function to update context history and find emerging patterns
create or replace function public.update_context_history(
    context_type text,
    recent_fact_ids text[],
    contextual_memory_ids text[],
    emotional_state_id text,
    context_metrics jsonb,
    pattern_similarity_threshold float default 0.85,
    time_window_hours int default 24
)
returns table (
    context_id text,
    emerging_patterns jsonb
)
language plpgsql
as $$
declare
    new_context_id text;
begin
    -- Insert new context history
    new_context_id := gen_random_uuid()::text;
    
    insert into public.context_history (
        id,
        context_type,
        recent_facts,
        contextual_memory,
        emotional_state,
        timestamp,
        metrics
    ) values (
        new_context_id,
        context_type,
        recent_fact_ids,
        contextual_memory_ids,
        emotional_state_id,
        now(),
        context_metrics
    );

    -- Find emerging patterns
    return query
    select
        new_context_id,
        jsonb_build_object(
            'cross_context_patterns', (
                select jsonb_agg(
                    jsonb_build_object(
                        'pattern_id', pattern_id,
                        'source_patterns', source_patterns,
                        'contexts', contexts,
                        'weight', combined_weight,
                        'emotional_signature', emotional_signature
                    )
                )
                from find_cross_context_patterns(
                    array[context_type],
                    (time_window_hours || ' hours')::interval,
                    pattern_similarity_threshold
                )
            )
        ) as emerging_patterns;
end;
$$;

-- Function to cleanup old data while preserving important patterns
create or replace function public.cleanup_old_data(
    retention_days int default 30,
    min_pattern_weight float default 0.5
)
returns void
language plpgsql
as $$
begin
    -- Delete old emotional states, preserving those referenced by important patterns
    delete from public.emotional_states
    where timestamp < now() - (retention_days || ' days')::interval
    and id not in (
        select emotional_state
        from public.context_history
        where id in (
            select unnest(recent_facts)
            from public.patterns
            where weight >= min_pattern_weight
        )
    );

    -- Delete old context history, preserving those with important patterns
    delete from public.context_history
    where timestamp < now() - (retention_days || ' days')::interval
    and id not in (
        select unnest(source_contexts)
        from public.cross_context_patterns
        where weight >= min_pattern_weight
    );

    -- Delete weak patterns older than retention period
    delete from public.patterns
    where weight < min_pattern_weight
    and last_accessed < now() - (retention_days || ' days')::interval;

    -- Delete weak cross-context patterns
    delete from public.cross_context_patterns
    where weight < min_pattern_weight
    and last_accessed < now() - (retention_days || ' days')::interval;
end;
$$; 
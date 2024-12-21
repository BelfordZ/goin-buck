-- Function to safely increment pattern weights
create or replace function public.increment_weight(current_weight float)
returns float
language plpgsql
as $$
begin
    -- Ensure weight stays between 0 and 1
    return least(1.0, greatest(0.0, current_weight));
end;
$$; 
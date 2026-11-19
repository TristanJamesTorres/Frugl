begin;

-- Check listing eligibility outside the caller's listing RLS policies so a
-- valid listing cannot make conversation creation fail through nested RLS.
create or replace function public.can_start_conversation(
  p_listing_id uuid,
  p_seller_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.listings l
    where l.id = p_listing_id
      and l.seller_id = p_seller_id
      and l.status in ('available', 'reserved')
      and l.is_visible
  );
$$;

revoke all on function public.can_start_conversation(uuid, uuid) from public, anon;
grant execute on function public.can_start_conversation(uuid, uuid) to authenticated;

drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert to authenticated
with check (
  buyer_id = auth.uid()
  and seller_id <> auth.uid()
  and public.is_active_user()
  and not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
  and public.can_start_conversation(listing_id, seller_id)
);

commit;

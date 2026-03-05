alter table public.todos enable row level security;

drop policy if exists "todos_select_all" on public.todos;
drop policy if exists "todos_insert_all" on public.todos;

create policy "todos_select_all"
on public.todos
for select
to public
using (true);

create policy "todos_insert_all"
on public.todos
for insert
to public
with check (true);

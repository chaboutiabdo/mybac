create table "public"."advice_tips" (
    id uuid not null default gen_random_uuid(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    title text not null,
    content text not null,
    target_user_id uuid references auth.users(id) on delete cascade,
    is_public boolean not null default true,
    priority smallint not null default 1,
    active boolean not null default true,
    expiry_date timestamp with time zone,
    
    constraint advice_tips_pkey primary key (id)
);

alter table "public"."advice_tips" enable row level security;

create policy "Admins have full access to advice tips"
on advice_tips for all
to authenticated
using (auth.jwt() ->> 'role' = 'admin')
with check (auth.jwt() ->> 'role' = 'admin');

create policy "Public tips are viewable by all authenticated users"
on advice_tips for select
to authenticated
using (
    active = true and (
        is_public = true 
        or target_user_id = auth.uid()
    )
    and (
        expiry_date is null 
        or expiry_date > now()
    )
);

-- Create trigger to update updated_at timestamp
create trigger handle_updated_at before update on advice_tips
  for each row execute procedure moddatetime (updated_at);

-- Create an index on commonly filtered columns
create index advice_tips_active_public_idx on advice_tips(active, is_public);
create index advice_tips_target_user_idx on advice_tips(target_user_id);
create index advice_tips_expiry_date_idx on advice_tips(expiry_date);

-- Insert some initial tips
insert into advice_tips (title, content, is_public, priority) values 
(
    'مراجعة منتظمة',
    E'نصيحة مهمة للنجاح في امتحان البكالوريا:\n\n• راجع دروسك بشكل يومي\n• اعمل جدول للمراجعة\n• ركز على فهم المفاهيم الأساسية\n• حل تمارين من سنوات سابقة',
    true,
    2
),
(
    'الاهتمام بالصحة',
    E'للحفاظ على تركيزك وطاقتك:\n\n• نم 8 ساعات يومياً\n• تناول وجبات صحية\n• خذ فترات راحة قصيرة\n• مارس الرياضة بانتظام',
    true,
    1
),
(
    'استراتيجية حل الأسئلة',
    E'عند الإجابة على أسئلة الامتحان:\n\n• اقرأ السؤال بتمعن\n• حدد المطلوب بدقة\n• نظم وقتك\n• راجع إجاباتك',
    true,
    2
);

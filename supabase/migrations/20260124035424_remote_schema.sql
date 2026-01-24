
  create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "content" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "author_name" text not null,
    "author_avatar" text,
    "post_slug" text not null
      );


alter table "public"."comments" enable row level security;

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);

CREATE INDEX idx_comments_post_slug ON public.comments USING btree (post_slug);

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";


  create policy "Enable insert for authenticated users only"
  on "public"."comments"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Enable read access for all users"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER "vercel builds on new comments" AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://api.vercel.com/v1/integrations/deploy/prj_NxCmkMamxScAdT6njlt4WTMOEGn6/tukrY87tGx', 'POST', '{"Content-type":"application/json"}', '{}', '5000');



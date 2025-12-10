-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Fix 'books' table constraints
-- We try to add a UNIQUE constraint to 'id'. 
-- This satisfies the requirement for a Foreign Key, even if 'id' is not the Primary Key.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'books_id_unique') THEN
    ALTER TABLE books ADD CONSTRAINT books_id_unique UNIQUE (id);
  END IF;
EXCEPTION
  WHEN others THEN RAISE NOTICE 'Could not add unique constraint, maybe it exists or data is duplicate.';
END $$;

-- 3. Create 'book_pages' table
create table if not exists book_pages (
  id bigserial primary key,
  book_id uuid not null references books(id) on delete cascade,
  content text,
  page_number integer,
  embedding vector(768)
);

-- 4. Search function
create or replace function match_book_pages (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_book_ids uuid[] default null
) returns table (
  id bigint,
  book_id uuid,
  content text,
  page_number integer,
  similarity float
) language plpgsql stable as $$
begin
  return query
  select
    book_pages.id,
    book_pages.book_id,
    book_pages.content,
    book_pages.page_number,
    1 - (book_pages.embedding <=> query_embedding) as similarity
  from book_pages
  where 1 - (book_pages.embedding <=> query_embedding) > match_threshold
  and (filter_book_ids is null or book_pages.book_id = any(filter_book_ids))
  order by book_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 5. Search function V2 (to avoid overloading ambiguity)
create or replace function match_book_pages_v2 (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_book_ids uuid[] default null
) returns table (
  id bigint,
  book_id uuid,
  content text,
  page_number integer,
  similarity float
) language plpgsql stable as $$
begin
  return query
  select
    book_pages.id,
    book_pages.book_id,
    book_pages.content,
    book_pages.page_number,
    1 - (book_pages.embedding <=> query_embedding) as similarity
  from book_pages
  where 1 - (book_pages.embedding <=> query_embedding) > match_threshold
  and (filter_book_ids is null or book_pages.book_id = any(filter_book_ids))
  order by book_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;

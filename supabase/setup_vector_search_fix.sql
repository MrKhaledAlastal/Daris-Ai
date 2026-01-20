-- 1. CLEANUP ALL VERSIONS (Deep Clean)
-- This removes any ambiguity once and for all.
drop function if exists match_book_pages_vector(vector(384), int);
drop function if exists match_book_pages_vector(vector(384), int, uuid);
drop function if exists match_book_pages_vector(vector(384), int, uuid, float);

-- 2. CREATE THE FINAL DEFINITIVE VERSION
create or replace function match_book_pages_vector (
  query_embedding vector(384), 
  match_count int DEFAULT 10,
  filter_book_id uuid DEFAULT NULL
) returns table (
  book_id uuid,
  page_number int,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    book_pages.book_id,
    book_pages.page_number,
    book_pages.content,
    1 - (book_pages.embedding <=> query_embedding) as similarity
  from book_pages
  where 
    (filter_book_id is null or book_pages.book_id = filter_book_id)
    and (1 - (book_pages.embedding <=> query_embedding) > 0.05) -- Lower threshold for safety
  order by book_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;

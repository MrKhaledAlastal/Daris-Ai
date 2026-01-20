-- 1. Check if content exists (Text Search)
-- Run this first to verify the book content is actually there
SELECT page_number, substring(content from 1 for 200) as preview
FROM book_pages 
WHERE content LIKE '%لنز%'
LIMIT 5;

-- 2. FIX THE SEARCH FUNCTION (Crucial Step)
-- The error "PGRST203" means there are duplicate functions causing confusion.
-- We must delete ALL versions of the function explicitly before creating the new one.

DROP FUNCTION IF EXISTS match_book_pages_vector(vector(384), int);
DROP FUNCTION IF EXISTS match_book_pages_vector(vector(384), int, uuid);

-- 3. Re-create the function cleanly
create or replace function match_book_pages_vector (
  query_embedding vector(384), 
  match_count int DEFAULT 20,
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
    and (1 - (book_pages.embedding <=> query_embedding) > 0.1)
  order by book_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;

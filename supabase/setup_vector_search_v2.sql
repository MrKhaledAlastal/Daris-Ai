-- 1. Create the Search Function with Match Threshold
-- We update this to accept 'match_threshold' as a parameter
create or replace function match_book_pages_vector (
  query_embedding vector(384), 
  match_count int DEFAULT 20,
  filter_book_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.1 -- ✅ Added this parameter
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
    and (1 - (book_pages.embedding <=> query_embedding) > match_threshold) -- ✅ Use parameter
  order by book_pages.embedding <=> query_embedding
  limit match_count;
end;
$$;

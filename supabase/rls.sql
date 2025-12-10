-- Disable RLS on books table for now (we'll add it back later with proper policies)
-- The API endpoint (/api/admin/books) uses service role and bypasses RLS
ALTER TABLE books DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Migrate all books from old user_id to new user_id
-- ============================================
-- Old user_id: BGLqsVvT8dhkJrMaiQPOhD7oqK93
-- New user_id: c5f73e14-88b0-4f18-9ef1-c8a00c3bd4c9

UPDATE books
SET user_id = 'c5f73e14-88b0-4f18-9ef1-c8a00c3bd4c9'
WHERE user_id = 'BGLqsVvT8dhkJrMaiQPOhD7oqK93';

-- Verify the update
SELECT COUNT(*) as updated_count FROM books WHERE user_id = 'c5f73e14-88b0-4f18-9ef1-c8a00c3bd4c9';

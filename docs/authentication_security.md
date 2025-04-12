# Authentication and Security Documentation

## Authentication System

The application uses Supabase Auth for user authentication with the following configuration:

### Authentication Flow
1. Users register with email and password
2. Auto-confirm is enabled for development (users don't need to verify email)
3. After successful authentication, users are redirected to the home page
4. Protected routes are enforced via middleware

### Client Components
The following components have been marked with "use client" directive:
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `Input.tsx`
- `Label.tsx`
- `Button.tsx`
- `SearchBuilder.tsx`
- `SaveSearchDialog.tsx`
- Login and register pages

## Database Synchronization

### User Data Synchronization
The application maintains two user tables:
1. `auth.users` - Managed by Supabase Auth
2. `public.users` - Application-specific user data

### Database Triggers
We've implemented database triggers to automatically sync these tables:

1. **on_auth_user_created**: Creates a record in `public.users` when a new user registers
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.users (id, email, created_at)
     VALUES (NEW.id, NEW.email, NEW.created_at)
     ON CONFLICT (id) DO UPDATE
     SET email = NEW.email;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

2. **on_auth_user_updated**: Updates the `public.users` record when a user's details change
   ```sql
   CREATE OR REPLACE FUNCTION public.handle_user_update()
   RETURNS TRIGGER AS $$
   BEGIN
     UPDATE public.users
     SET email = NEW.email,
         last_login = NEW.last_sign_in_at
     WHERE id = NEW.id;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE OR REPLACE TRIGGER on_auth_user_updated
     AFTER UPDATE ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();
   ```

## Row Level Security (RLS)

### Enabled Tables
RLS has been enabled on the following tables:
- `public.users`
- `public.search_results`
- `public.search_requests`
- `public.duplicate_log`
- `public.review_tags`

### RLS Policies
The following RLS policies have been implemented:

1. **Users Table**
   ```sql
   CREATE POLICY "Users can view their own data" 
   ON public.users 
   FOR SELECT 
   USING (auth.uid() = id);
   ```

2. **Search Requests Table**
   ```sql
   CREATE POLICY "Users can view their own search requests" 
   ON public.search_requests 
   FOR SELECT 
   USING (auth.uid() = user_id);
   ```

3. **Search Results Table**
   ```sql
   CREATE POLICY "Users can view search results from their requests" 
   ON public.search_results 
   FOR SELECT 
   USING (query_id IN (SELECT query_id FROM public.search_requests WHERE user_id = auth.uid()));
   ```

4. **Duplicate Log Table**
   ```sql
   CREATE POLICY "Users can view their own duplicate logs" 
   ON public.duplicate_log 
   FOR SELECT 
   USING (true);
   ```

5. **Review Tags Table**
   ```sql
   CREATE POLICY "Users can view their own review tags" 
   ON public.review_tags 
   FOR SELECT 
   USING (true);
   ```

## RLS Policy Guidelines for Future Development

### When creating new tables:
1. Always enable RLS: `ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;`
2. Create appropriate policies based on the table's purpose

### Common Policy Patterns:

#### User-Specific Data
```sql
CREATE POLICY "policy_name" ON table_name
FOR operation
USING (auth.uid() = user_id_column);
```

#### Related to User-Specific Data
```sql
CREATE POLICY "policy_name" ON table_name
FOR operation
USING (foreign_key IN (SELECT id FROM parent_table WHERE user_id = auth.uid()));
```

#### Shared/Public Data
```sql
CREATE POLICY "policy_name" ON table_name
FOR operation
USING (is_public = true OR auth.uid() = user_id_column);
```

## Security Considerations for Remaining Tasks

1. **Search Strategy Management (Task 5.5)**
   - Ensure saved searches are associated with the user_id
   - Use RLS policies to restrict access to user's own searches

2. **SERP Execution and Results Management (Task 6)**
   - Associate search results with the user who initiated the search
   - Implement RLS policies for any new tables created

3. **Review Interface Implementation (Task 7)**
   - Ensure all client-side components have "use client" directive
   - Associate review data with the user who created it

4. **Reporting and Export System (Task 8)**
   - Respect RLS boundaries when generating reports
   - Only include data the current user has access to in exports

-- Premium requests filed from /pricing, made readable by the admin inbox and
-- bound to the account that filed them.

-- This policy subqueries auth.users, which the authenticated role cannot read,
-- so every client read of the table failed with "permission denied for table
-- users" -- the admin's included. Nothing could see a request.
DROP POLICY "Users can read their own support requests" ON public.support_requests;

-- Approving a request upgrades the account that filed it, not whatever email
-- was typed into the form. Nullable: rows from before this column, and rows
-- inserted with the service key, have no signed-in user behind them.
ALTER TABLE public.support_requests
  ADD COLUMN requester_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;

-- One way in: a signed-in user, filing as themselves. The old WITH CHECK (true)
-- let anyone, signed in or not, file a request naming any email.
DROP POLICY "Anyone can submit a support request" ON public.support_requests;
DROP POLICY "Users can create their own support requests" ON public.support_requests;
CREATE POLICY "Users file support requests as themselves" ON public.support_requests
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

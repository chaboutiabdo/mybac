-- Anonymous institutions can file a school inquiry, without reopening the
-- anon-insert hole that 20260918000000_premium_request_inbox.sql deliberately
-- closed for the rest of support_requests.
--
-- That migration replaced an open `WITH CHECK (true)` INSERT policy with an
-- authenticated-only one enforcing `requester_id = auth.uid()`, specifically
-- because the open version let anyone, signed in or not, file a request
-- naming any email -- and approving a request upgrades the account behind
-- requester_id, so a spoofed email was an account-takeover path.
--
-- A school inquiry carries none of that risk: approving one only flips
-- support_requests.status, it never reads requester_id and never touches any
-- profile. So this policy is scoped to exactly that one `type` value -- it
-- cannot be used to slip a 'premium_subscription' row past the real policy,
-- which is untouched below.
CREATE POLICY "Anyone can submit a school inquiry" ON public.support_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (type = 'school_inquiry');

-- "Admins can view all requests" is FOR ALL (SELECT+INSERT+UPDATE+DELETE) and
-- applies to every role including anon, unlike its two siblings below which
-- are properly scoped. Its USING clause reads profiles to check role='admin'
-- -- and evaluating that subquery for anon means evaluating profiles' OWN
-- policies for anon too, one of which calls is_admin() -- a function anon
-- lost EXECUTE on in 20260922000000_audit_fixes.sql. The result: ANY anon
-- operation on support_requests errors with "permission denied for function
-- is_admin" before ever reaching the policy that would actually decide it --
-- discovered because the policy above still failed until this was found too.
-- It is redundant, not a capability loss: "Admins can read all support
-- requests" (SELECT) and "Admins can update support requests" (UPDATE)
-- already cover everything an admin actually does with this table.
DROP POLICY "Admins can view all requests" ON public.support_requests;

# 🎯 Subscription System Setup Guide

This guide will help you set up the complete subscription system for THE SMART platform.

## 📋 Prerequisites

- Supabase project set up
- Database migrations applied
- Admin user created

## 🗄️ Database Setup

### 1. Run Database Migrations

Execute the migration file to create required tables:

```bash
# Apply the migration
supabase db push
```

Or manually run the SQL in `supabase/migrations/20250115000000_create_subscription_tables.sql`

### 2. Verify Tables Created

Check that these tables exist in your Supabase database:
- `profiles` (with `subscription_status` column)
- `admin_advice`
- `support_requests`

## 🔧 Configuration

### 1. Update Supabase RLS Policies

The migration includes RLS policies, but verify they're working:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles', 'admin_advice', 'support_requests');
```

### 2. Create Admin User

Make sure you have an admin user in the profiles table:

```sql
-- Update a user to admin role
UPDATE profiles 
SET role = 'admin', subscription_status = 'admin' 
WHERE email = 'your-admin@email.com';
```

## 🧪 Testing the System

### 1. Test Database Connection

```typescript
import { testSubscriptionFlow } from '@/utils/testSubscriptionFlow';

// Run the test
testSubscriptionFlow().then(success => {
  console.log('Test result:', success);
});
```

### 2. Test Subscription Status

```typescript
import { testSubscriptionStatus } from '@/utils/testSubscriptionFlow';

// Test with a user ID
testSubscriptionStatus('user-uuid-here');
```

### 3. Test Admin Advice

```typescript
import { testAdminAdvice } from '@/utils/testSubscriptionFlow';

// Test admin advice functionality
testAdminAdvice();
```

## 🎮 Admin Dashboard Features

### 1. Subscription Management
- View all users and their subscription status
- Upgrade/downgrade users between free and premium
- Search and filter users
- View conversion statistics

### 2. Admin Advice Management
- Create daily advice messages
- Pin important advice to homepage
- Edit and delete advice
- View advice history

### 3. Support Requests
- View payment proof submissions
- Manage support tickets
- Track subscription requests

## 🔐 Access Control

### Free Users Can Access:
- ✅ Videos page (free videos only)
- ✅ Exams page (full access)
- ✅ Alumni page (view profiles only)
- ✅ Daily Quiz page (daily quizzes only)
- ✅ Homepage with admin advice

### Premium Users Get Additional Access:
- ✅ All free features
- ✅ Learn with AI page
- ✅ Full Quizzes page
- ✅ Alumni booking sessions
- ✅ AI-powered exam solving
- ✅ Monthly progress summaries
- ✅ Prize opportunities

## 💰 Payment Flow

### 1. User Clicks "اشترك الآن" (Subscribe Now)
- Payment instructions dialog opens
- Shows payment methods (bank transfer, post office, etc.)
- User can submit payment proof

### 2. Admin Reviews Payment
- Admin checks support requests
- Verifies payment proof
- Updates user subscription status in database

### 3. User Gets Premium Access
- Subscription status updated in real-time
- User gains access to premium features
- Confirmation message sent

## 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Admin user created
- [ ] Test subscription flow works
- [ ] Admin dashboard accessible
- [ ] Payment instructions updated with real details
- [ ] Support contact information updated

## 🐛 Troubleshooting

### Common Issues:

1. **"No rows found" errors**
   - Check if tables exist
   - Verify RLS policies
   - Check user authentication

2. **Subscription status not updating**
   - Verify `subscription_status` column exists
   - Check update permissions
   - Refresh user session

3. **Admin advice not showing**
   - Check if advice is pinned
   - Verify RLS policies for reading
   - Check component loading

### Debug Commands:

```typescript
// Check current user subscription
const { data: profile } = await supabase
  .from('profiles')
  .select('subscription_status, role')
  .eq('user_id', user.id)
  .single();

console.log('User subscription:', profile);
```

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase logs
3. Test database connections
4. Check RLS policies

## 🎉 Success!

Once everything is set up, you should have:
- ✅ Working subscription system
- ✅ Admin dashboard for management
- ✅ Payment flow with proof submission
- ✅ Real-time access control
- ✅ Daily advice system
- ✅ Support request management

The platform is now ready for production use! 🚀

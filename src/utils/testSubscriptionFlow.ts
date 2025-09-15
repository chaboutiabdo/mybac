import { supabase } from '@/integrations/supabase/client';

export const testSubscriptionFlow = async () => {
  console.log('🧪 Testing Subscription Flow...\n');

  try {
    // Test 1: Check if required tables exist
    console.log('1️⃣ Testing database tables...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError);
      return false;
    }
    console.log('✅ Profiles table accessible');

    const { data: adminAdvice, error: adviceError } = await supabase
      .from('admin_advice')
      .select('*')
      .limit(1);
    
    if (adviceError) {
      console.error('❌ Admin advice table error:', adviceError);
      return false;
    }
    console.log('✅ Admin advice table accessible');

    const { data: supportRequests, error: supportError } = await supabase
      .from('support_requests')
      .select('*')
      .limit(1);
    
    if (supportError) {
      console.error('❌ Support requests table error:', supportError);
      return false;
    }
    console.log('✅ Support requests table accessible\n');

    // Test 2: Test subscription status update
    console.log('2️⃣ Testing subscription status update...');
    
    // This would need to be done with an actual user ID
    // For now, we'll just test the query structure
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'premium',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', 'test-user-id'); // This will fail but test the structure
    
    if (updateError && !updateError.message.includes('No rows found')) {
      console.error('❌ Subscription update error:', updateError);
      return false;
    }
    console.log('✅ Subscription update query structure valid\n');

    // Test 3: Test admin advice creation
    console.log('3️⃣ Testing admin advice creation...');
    
    const { error: adviceInsertError } = await supabase
      .from('admin_advice')
      .insert([{
        title: 'Test Advice',
        content: 'This is a test advice message',
        is_pinned: true
      }]);
    
    if (adviceInsertError) {
      console.error('❌ Admin advice creation error:', adviceInsertError);
      return false;
    }
    console.log('✅ Admin advice creation successful\n');

    // Test 4: Test support request creation
    console.log('4️⃣ Testing support request creation...');
    
    const { error: supportInsertError } = await supabase
      .from('support_requests')
      .insert([{
        name: 'Test User',
        email: 'test@example.com',
        phone: '+1234567890',
        message: 'Test support request',
        type: 'premium_subscription'
      }]);
    
    if (supportInsertError) {
      console.error('❌ Support request creation error:', supportInsertError);
      return false;
    }
    console.log('✅ Support request creation successful\n');

    // Test 5: Test data retrieval
    console.log('5️⃣ Testing data retrieval...');
    
    const { data: allAdvice, error: adviceFetchError } = await supabase
      .from('admin_advice')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (adviceFetchError) {
      console.error('❌ Admin advice fetch error:', adviceFetchError);
      return false;
    }
    console.log(`✅ Retrieved ${allAdvice?.length || 0} admin advice records`);

    const { data: allSupport, error: supportFetchError } = await supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (supportFetchError) {
      console.error('❌ Support requests fetch error:', supportFetchError);
      return false;
    }
    console.log(`✅ Retrieved ${allSupport?.length || 0} support requests\n`);

    console.log('🎉 All subscription flow tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
};

// Test function for subscription status checking
export const testSubscriptionStatus = async (userId: string) => {
  console.log(`🔍 Testing subscription status for user: ${userId}`);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_status, role')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching subscription status:', error);
      return null;
    }

    console.log('✅ Subscription status:', data);
    return data;
  } catch (error) {
    console.error('❌ Error in subscription status test:', error);
    return null;
  }
};

// Test function for admin advice
export const testAdminAdvice = async () => {
  console.log('📝 Testing admin advice functionality...');
  
  try {
    // Test pinned advice retrieval
    const { data: pinnedAdvice, error: pinnedError } = await supabase
      .from('admin_advice')
      .select('*')
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (pinnedError && pinnedError.code !== 'PGRST116') {
      console.error('❌ Error fetching pinned advice:', pinnedError);
      return false;
    }

    if (pinnedAdvice) {
      console.log('✅ Pinned advice found:', pinnedAdvice.title);
    } else {
      console.log('ℹ️ No pinned advice found');
    }

    return true;
  } catch (error) {
    console.error('❌ Error in admin advice test:', error);
    return false;
  }
};

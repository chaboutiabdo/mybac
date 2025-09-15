# 👥 Admin User Management Guide

## 🔐 How to Manage User Subscriptions

### **Accessing Admin Dashboard**
1. Login to your account
2. Navigate to `/admin` 
3. Click on "إدارة الاشتراكات" (Subscription Management)

### **User Types**

#### **👤 Normal Users (عادي)**
- **Access**: Basic features only
- **Pages**: Videos (free only), Exams, Alumni (view only), Daily Quiz
- **Cannot Access**: Learn AI, Full Quizzes, Alumni booking

#### **💎 Premium Users (مميز)**
- **Access**: All features
- **Pages**: Everything including Learn AI, Full Quizzes, Alumni booking
- **Special Features**: AI assistance, monthly summaries, prizes

#### **👑 Admin Users (مدير)**
- **Access**: Everything + Admin dashboard
- **Can Do**: Manage all users, create advice, view analytics

### **How to Change User Status**

#### **Make User Premium:**
1. Find the user in the admin dashboard
2. Click "ترقية إلى مميز" (Upgrade to Premium)
3. User immediately gets premium access

#### **Make User Normal:**
1. Find the user in the admin dashboard  
2. Click "تغيير إلى عادي" (Change to Normal)
3. User loses premium access

### **Database Management**

#### **Direct Database Updates:**
```sql
-- Make user premium
UPDATE profiles 
SET role = 'premium', subscription_status = 'premium' 
WHERE email = 'user@example.com';

-- Make user normal
UPDATE profiles 
SET role = 'student', subscription_status = 'free' 
WHERE email = 'user@example.com';

-- Make user admin
UPDATE profiles 
SET role = 'admin', subscription_status = 'admin' 
WHERE email = 'admin@example.com';
```

### **Statistics Dashboard**

The admin dashboard shows:
- **إجمالي المستخدمين**: Total users
- **المشتركين المميزين**: Premium users count
- **المستخدمين العاديين**: Normal users count  
- **معدل التحويل**: Conversion rate percentage

### **Search & Filter**

- **Search**: By name or email
- **Filter**: By subscription status (All, Normal, Premium)
- **Sort**: By join date (newest first)

### **Real-time Updates**

- Changes are applied immediately
- Users see access changes without refresh
- Admin dashboard updates in real-time

## 🚀 Quick Setup

### **1. Create Admin Account**
```sql
-- Replace with your email
UPDATE profiles 
SET role = 'admin', subscription_status = 'admin' 
WHERE email = 'your-email@example.com';
```

### **2. Test User Access**
1. Create test accounts
2. Try accessing protected pages
3. Verify premium features work
4. Check admin dashboard

### **3. Monitor Usage**
- Check conversion rates
- Monitor user activity
- Review support requests

## 🔧 Troubleshooting

### **User Can't Access Premium Features**
1. Check their subscription status in admin dashboard
2. Verify they're logged in
3. Clear browser cache
4. Check database directly

### **Admin Dashboard Not Loading**
1. Verify you have admin role
2. Check browser console for errors
3. Ensure database connection works
4. Try refreshing the page

### **Changes Not Saving**
1. Check database permissions
2. Verify RLS policies
3. Check for JavaScript errors
4. Try direct database update

## 📊 Best Practices

1. **Regular Monitoring**: Check user statistics weekly
2. **Backup Data**: Export user data regularly  
3. **Test Changes**: Always test on a test account first
4. **Document Changes**: Keep track of user status changes
5. **Monitor Performance**: Watch for slow queries or errors

## 🎯 Success Metrics

- **Conversion Rate**: Aim for 15-25% premium conversion
- **User Retention**: Monitor monthly active users
- **Support Requests**: Track payment proof submissions
- **Feature Usage**: Monitor which features are most popular

---

**Need Help?** Check the browser console for errors or contact the development team.

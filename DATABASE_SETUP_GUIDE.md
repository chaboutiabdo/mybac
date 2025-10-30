# 📋 Database Setup Guide for Alumni Files & Advice

## 🚀 Quick Start Instructions

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com](https://supabase.com)
2. Login to your account
3. Select your project
4. Click on **"SQL Editor"** in the left sidebar

### Step 2: Run the Setup Script
1. Copy the entire contents of `setup_database.sql` file
2. Paste it into the SQL Editor in Supabase
3. Click the **"Run"** button (or press Ctrl+Enter)
4. Wait for the success message

### Step 3: Verify Setup
After running the script, you should see:
- ✅ "Database setup completed successfully!"
- ✅ Table row counts should be 0 (no data yet)

### Step 4: Make Yourself Admin (Important!)
1. Go to **"Authentication"** in the left sidebar
2. Find your user account
3. Note your **User UID** (copy it)
4. Go back to **"SQL Editor"**
5. Run this query (replace `'YOUR-USER-ID'` with your actual User UID):

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = 'YOUR-USER-ID';
```

### Step 5: Verify Admin Access
1. Logout and login again to your app
2. Click on your profile dropdown
3. You should see **"Admin Dashboard"** with a crown icon
4. Click on it to access the admin dashboard

### Step 6: Test File Upload
1. Go to **Admin Dashboard**
2. Click on **"Alumni"** in the sidebar
3. Click **"Manage Files & Advice"** on any alumni card
4. Try uploading a file

## 📁 Storage Bucket Setup

The setup script creates a bucket called `alumni-files`:
- **Location**: Storage > alumni-files
- **Files will be stored**: `alumni/{alumni_id}/{category}/{filename}`
- **Public access**: Read-only for everyone
- **Upload access**: Admin-only

## 🗄️ Database Tables Created

### 1. `alumni_files` Table
Stores file information linked to alumni profiles.

**Columns:**
- `id` - Unique identifier
- `alumni_id` - Reference to alumni table
- `file_name` - Original file name
- `file_path` - Public URL to the file
- `file_type` - MIME type (e.g., application/pdf)
- `file_size` - File size in bytes
- `description` - Optional description
- `uploaded_by` - Admin user ID who uploaded
- `created_at` - Timestamp

### 2. `alumni_advice` Table
Stores advice entries linked to alumni profiles.

**Columns:**
- `id` - Unique identifier
- `alumni_id` - Reference to alumni table
- `title` - Advice title
- `content` - Advice content
- `category` - Advice category (general, study, exam, etc.)
- `is_featured` - Featured flag
- `created_at` - Timestamp

## 🔐 Security & Permissions

### Row Level Security (RLS)
All tables have RLS enabled with these policies:

**For Everyone:**
- ✅ Can read/view files and advice

**For Admins Only:**
- ✅ Can upload/insert files and advice
- ✅ Can delete files and advice

### Storage Policies
- ✅ Everyone can download files
- ❌ Only admins can upload files
- ❌ Only admins can delete files

## 🐛 Troubleshooting

### Issue: "Table doesn't exist"
**Solution**: Make sure you ran the entire `setup_database.sql` script

### Issue: "Permission denied"
**Solution**: Make sure your profile has `role = 'admin'` in the profiles table

### Issue: "Bucket not found"
**Solution**: Go to Storage > Buckets and create `alumni-files` bucket manually with public access

### Issue: "Cannot upload file"
**Solution**: 
1. Check if you're logged in as admin
2. Verify storage bucket exists: `alumni-files`
3. Check browser console for specific errors

## 📞 Support

If you encounter any issues, check:
1. Browser console for errors
2. Supabase logs in the dashboard
3. Make sure all dependencies are installed

## ✅ Verification Checklist

- [ ] Database tables created (`alumni_files`, `alumni_advice`)
- [ ] Storage bucket created (`alumni-files`)
- [ ] Row Level Security policies applied
- [ ] Storage policies applied
- [ ] Your user set as admin
- [ ] Can access Admin Dashboard
- [ ] Can upload files
- [ ] Can add advice
- [ ] Files appear in Supabase Storage

## 🎉 Success!

Once all steps are complete, you should be able to:
1. ✅ Access Admin Dashboard
2. ✅ See all alumni
3. ✅ Click "Manage Files & Advice" on any alumni
4. ✅ Upload files
5. ✅ Add advice
6. ✅ View uploaded files in Supabase Storage
7. ✅ See files and advice on the Alumni page

---

**Need help?** Check the SQL script comments or browser console for detailed error messages.

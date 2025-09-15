import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle2, Timer, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface SupportRequest {
  id: string;
  email: string;
  name: string;
  phone: string;
  message: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface Subscription {
  user_id: string;
  name: string;
  email: string;
  role: 'student' | 'premium' | 'admin';
  subscription_status: 'free' | 'pending' | 'premium';
  created_at: string;
  updated_at: string;
  support_request?: SupportRequest;
}

import { useAuth } from "@/contexts/AuthContext";

export function SubscriptionManagement() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    console.log('Current user:', user);
    if (user) {
      fetchSubscriptions();
    }
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      console.log('Fetching subscriptions...');
      
      // Get all non-admin profiles with basic fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email, role, created_at, updated_at')
        .not('role', 'eq', 'admin')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "خطأ في التحميل",
          description: "حدث خطأ أثناء تحميل قائمة المستخدمين. " + profilesError.message,
          variant: "destructive",
        });
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.warn('No profiles returned from database');
        setSubscriptions([]);
        toast({
          title: "لا يوجد مستخدمين",
          description: "لا يوجد مستخدمين في قاعدة البيانات",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched profiles:', profiles);

      // For now, skipping support requests to simplify
      const supportRequests = [];

      // Combine profiles with support requests and derive status from role
      const combinedData = profiles.map(profile => ({
        ...profile,
        subscription_status: profile.role === 'premium' ? 'premium' : 'free',
        support_request: supportRequests.find(req => req.email === profile.email)
      }));

      console.log('Combined data:', combinedData);
      setSubscriptions(combinedData);
    } catch (error) {
      console.error('Error in fetchSubscriptions:', error);
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل قائمة الاشتراكات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: 'free' | 'premium') => {
    try {
      setLoading(true);
      console.log('🚀 Starting update for user:', userId, 'to status:', newStatus);

      // Step 1: Verify the current state
      const { data: currentUser, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current user: ${fetchError.message}`);
      }

      if (!currentUser) {
        throw new Error('User not found');
      }

      // Step 2: Prepare update data - only update role
      const updateData = {
        role: newStatus === 'premium' ? 'premium' : 'student',
        updated_at: new Date().toISOString()
      };

      console.log('📝 Current user:', currentUser);
      console.log('📝 Updating with data:', updateData);

      // Step 3: Perform the update with retries
      // Perform the update
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Update failed:', updateError);
        throw updateError;
      }

      // Fetch the updated user
      const { data: updatedUser, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !updatedUser) {
        console.error('❌ Failed to fetch updated user:', fetchError);
        throw fetchError || new Error('Failed to fetch updated user');
      }

      if (!updatedUser) {
        throw new Error('Update failed after retries');
      }

      console.log('✅ Profile update successful:', updatedUser);

      // Step 4: Update related support requests
      if (updatedUser.email) {
        console.log('📨 Updating support requests for:', updatedUser.email);
        
        const { error: supportError } = await supabase
          .from('support_requests')
          .update({
            status: newStatus === 'premium' ? 'approved' : 'rejected',
            updated_at: new Date().toISOString()
          })
          .eq('email', updatedUser.email)
          .eq('type', 'premium_subscription')
          .eq('status', 'pending');

        if (supportError) {
          console.warn('⚠️ Support request update failed:', supportError);
          // Don't throw, as this is not critical
        } else {
          console.log('✅ Support request updated successfully');
        }
      }

      // Verify the role was updated correctly
      if (updatedUser.role !== (newStatus === 'premium' ? 'premium' : 'student')) {
        throw new Error('Role update verification failed');
      }

      console.log('✅ Update verified successfully:', updatedUser);

      // Step 6: Show success and refresh
      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث حالة الاشتراك إلى ${newStatus === 'premium' ? 'مميز' : 'مجاني'}`,
        duration: 5000,
      });

      await fetchSubscriptions();
    } catch (error) {
      console.error('❌ Error in handleUpdateStatus:', error);
      toast({
        title: "خطأ في التحديث",
        description: `فشل تحديث حالة الاشتراك: ${error.message}`,
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'premium':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'premium':
        return 'مميز';
      case 'pending':
        return 'قيد المراجعة';
      default:
        return 'مجاني';
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sub.subscription_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إدارة الاشتراكات</h2>
          <p className="text-muted-foreground">
            إدارة اشتراكات المستخدمين وترقية الحسابات
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن مستخدم..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فلتر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="free">مجاني</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="premium">مميز</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead>حالة الاشتراك</TableHead>
                  <TableHead>تاريخ التسجيل</TableHead>
                  <TableHead>آخر تحديث</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري التحميل...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSubscriptions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      لا توجد نتائج
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(sub.subscription_status)}`}>
                          <div className="flex items-center gap-1">
                            {sub.subscription_status === 'premium' && <CheckCircle2 className="h-3 w-3" />}
                            {sub.subscription_status === 'pending' && <Timer className="h-3 w-3" />}
                            {sub.subscription_status === 'free' && <XCircle className="h-3 w-3" />}
                            {getStatusLabel(sub.subscription_status)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(sub.created_at).toLocaleDateString('ar')}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.updated_at).toLocaleDateString('ar')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sub.subscription_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleUpdateStatus(sub.user_id, 'premium')}
                              >
                                قبول الطلب
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(sub.user_id, 'free')}
                              >
                                رفض
                              </Button>
                            </>
                          )}
                          {sub.subscription_status === 'free' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(sub.user_id, 'premium')}
                            >
                              ترقية للمميز
                            </Button>
                          )}
                          {sub.subscription_status === 'premium' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(sub.user_id, 'free')}
                            >
                              إلغاء الاشتراك المميز
                            </Button>
                          )}
                          {sub.support_request && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setShowDetails(true);
                              }}
                            >
                              عرض الطلب
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل طلب الاشتراك</DialogTitle>
            <DialogDescription>
              مراجعة تفاصيل طلب الاشتراك المميز
            </DialogDescription>
          </DialogHeader>
          {selectedSubscription?.support_request && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">معلومات المستخدم</h4>
                <p>الاسم: {selectedSubscription.name}</p>
                <p>البريد الإلكتروني: {selectedSubscription.email}</p>
                <p>رقم الهاتف: {selectedSubscription.support_request.phone}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">رسالة الطلب</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedSubscription.support_request.message}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-1">تاريخ الطلب</h4>
                <p>{new Date(selectedSubscription.support_request.created_at).toLocaleDateString('ar')}</p>
              </div>
              {selectedSubscription.subscription_status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedSubscription.user_id, 'premium');
                      setShowDetails(false);
                    }}
                  >
                    قبول الطلب
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      handleUpdateStatus(selectedSubscription.user_id, 'free');
                      setShowDetails(false);
                    }}
                  >
                    رفض الطلب
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

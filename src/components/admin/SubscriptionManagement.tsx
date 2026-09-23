import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Search, Filter, Crown, Users, TrendingUp, Inbox } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage } from "@/lib/utils";
import { formatDateDZ } from "@/lib/bac";
import { EmptyState, ErrorState, Loading } from "@/components/ui/states";
import type { Tables } from "@/integrations/supabase/types";

// exactly the columns the query below selects, taken from the generated row
type Profile = Pick<
  Tables<'profiles'>,
  'user_id' | 'name' | 'email' | 'role' | 'subscription_status' | 'created_at' | 'updated_at'
>;

// a payment receipt sent from /pricing; approving upgrades requester_id
type PremiumRequest = Pick<
  Tables<'support_requests'>,
  'id' | 'name' | 'email' | 'phone' | 'message' | 'requester_id' | 'created_at'
>;

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  conversionRate: number;
}

export function SubscriptionManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // null until loaded, so "no requests" never shows before we actually know
  const [requests, setRequests] = useState<PremiumRequest[] | null>(null);
  const [requestsFailed, setRequestsFailed] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    conversionRate: 0
  });

  useEffect(() => {
    fetchProfiles();
    fetchRequests();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, statusFilter]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email, role, subscription_status, created_at, updated_at')
        .not('role', 'eq', 'admin')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("خطأ في تحميل الملفات الشخصية", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsFailed(false);
    const { data, error } = await supabase
      .from('support_requests')
      .select('id, name, email, phone, message, requester_id, created_at')
      .eq('type', 'premium_subscription')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error:', error);
      setRequestsFailed(true);
      return;
    }
    setRequests(data);
  };

  const calculateStats = (profiles: Profile[]) => {
    const totalUsers = profiles.length;
    const premiumUsers = profiles.filter(p => p.subscription_status === 'premium' || p.role === 'premium').length;
    const freeUsers = totalUsers - premiumUsers;
    const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

    setStats({
      totalUsers,
      premiumUsers,
      freeUsers,
      conversionRate
    });
  };

  const filterProfiles = () => {
    let filtered = profiles;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(profile =>
        profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(profile => {
        const status = profile.subscription_status || profile.role;
        return status === statusFilter;
      });
    }

    setFilteredProfiles(filtered);
  };

  const updateSubscription = async (userId: string, newStatus: 'free' | 'premium') => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({ 
          role: newStatus === 'premium' ? 'premium' : 'student',
          subscription_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success("تم التحديث بنجاح", { description: `تم تحديث حالة المستخدم إلى ${newStatus === 'premium' ? 'مميز' : 'عادي'}` });

      await fetchProfiles();
    } catch (error) {
      console.error('Error:', error);
      toast.error("خطأ في تحديث الحالة", { description: errorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  const resolveRequest = async (request: PremiumRequest, status: 'approved' | 'rejected') => {
    if (status === 'approved') {
      if (!request.requester_id) return;
      // Upgrade before marking approved, and only a student: someone who filed
      // a request and has since become premium or admin keeps their role.
      // Setting 'premium' unconditionally demoted an admin who approved their
      // own old request.
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'premium', subscription_status: 'premium', updated_at: new Date().toISOString() })
        .eq('user_id', request.requester_id)
        .eq('role', 'student');

      if (error) {
        toast.error("خطأ في تحديث الحالة", { description: errorMessage(error) });
        return;
      }
      fetchProfiles();
    }

    const { error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', request.id);

    if (error) {
      toast.error("خطأ في تحديث الطلب", { description: errorMessage(error) });
      return;
    }
    toast.success(status === 'approved' ? "تم تفعيل الاشتراك المميز" : "تم رفض الطلب");
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      {/* Pending premium requests: the receipts students send from /pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            طلبات الاشتراك المعلّقة
            {requests && requests.length > 0 && <Badge>{requests.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requestsFailed ? (
            <ErrorState onRetry={fetchRequests} />
          ) : requests === null ? (
            <Loading />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="لا توجد طلبات معلّقة"
              description="تظهر هنا إيصالات الدفع التي يرسلها الطلاب من صفحة الاشتراك."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الطالب</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>تفاصيل الدفع</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium">{request.name}</p>
                      <p className="text-base text-muted-foreground">{request.email}</p>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr">{request.phone ?? "—"}</span>
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap">{request.message}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateDZ(request.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!request.requester_id || loading}
                          title={request.requester_id ? undefined : "طلب قديم غير مرتبط بحساب، رقِّ الطالب من الجدول أدناه"}
                          onClick={() => resolveRequest(request, 'approved')}
                        >
                          <CheckCircle2 className="h-4 w-4 me-1" />
                          تفعيل المميز
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={loading}
                          onClick={() => resolveRequest(request, 'rejected')}
                        >
                          <XCircle className="h-4 w-4 me-1" />
                          رفض
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-base font-medium text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-warning" />
              <div>
                <p className="text-base font-medium text-muted-foreground">المشتركين المميزين</p>
                <p className="text-3xl font-bold">{stats.premiumUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-base font-medium text-muted-foreground">المستخدمين العاديين</p>
                <p className="text-3xl font-bold">{stats.freeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <div>
                <p className="text-base font-medium text-muted-foreground">معدل التحويل</p>
                <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            إدارة الاشتراكات
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 me-2" />
                <SelectValue placeholder="فلترة حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="free">عادي</SelectItem>
                <SelectItem value="premium">مميز</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الانضمام</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">لم يتم العثور على مستخدمين</TableCell>
                </TableRow>
              ) : (
                filteredProfiles.map((profile) => {
                  const isPremium = profile.subscription_status === 'premium' || profile.role === 'premium';
                  return (
                    <TableRow key={profile.user_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{profile.name}</p>
                          <p className="text-base text-muted-foreground">{profile.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPremium ? 'default' : 'secondary'}>
                          {isPremium ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              مميز
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              عادي
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-base text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString('ar-DZ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!isPremium ? (
                          <Button
                            size="sm"
                            onClick={() => updateSubscription(profile.user_id, 'premium')}
                            className="bg-primary hover:bg-primary/90"
                          >
                            ترقية إلى مميز
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSubscription(profile.user_id, 'free')}
                          >
                            تغيير إلى عادي
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

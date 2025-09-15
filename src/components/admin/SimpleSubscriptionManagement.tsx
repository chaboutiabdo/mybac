import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, Search, Filter, Crown, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  user_id: string;
  name: string;
  email: string;
  role: 'student' | 'premium' | 'admin';
  subscription_status: 'free' | 'premium' | 'admin';
  created_at: string;
  updated_at: string;
}

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
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    premiumUsers: 0,
    freeUsers: 0,
    conversionRate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
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
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "خطأ في تحميل الملفات الشخصية",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث حالة المستخدم إلى ${newStatus === 'premium' ? 'مميز' : 'عادي'}`,
      });

      await fetchProfiles();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "خطأ في تحديث الحالة",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">المشتركين المميزين</p>
                <p className="text-2xl font-bold">{stats.premiumUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">المستخدمين العاديين</p>
                <p className="text-2xl font-bold">{stats.freeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">معدل التحويل</p>
                <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
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
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
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
                        <span className="text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString('ar-SA')}
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

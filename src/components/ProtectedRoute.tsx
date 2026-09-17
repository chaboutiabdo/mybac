import { Navigate } from "react-router-dom";
import { Loading } from "@/components/ui/states";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'student' | 'premium' | 'admin';
  showUpgradeMessage?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  showUpgradeMessage = true
}) => {
  const { user, profile, loading } = useAuth();
  const { isPremium, isAdmin, loading: subscriptionLoading } = useSubscription();

  if (loading || subscriptionLoading) {
    return <Loading full />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // `isPremium` is true for role='premium' OR subscription_status='premium'.
    // This used to test `profile.role` alone, which locked out anyone whose
    // subscription was recorded on subscription_status.
    const hasAccess =
      requiredRole === 'premium'
        ? isPremium || isAdmin
        : profile.role === requiredRole || profile.role === 'admin' || isAdmin;
    
    // For premium features, show upgrade message or redirect
    if (!hasAccess && requiredRole === 'premium') {
      if (showUpgradeMessage) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-background px-6">
            <div className="w-full max-w-md text-center">
              <Crown className="mx-auto mb-5 h-7 w-7 text-accent" strokeWidth={1.5} aria-hidden />
              <h1 className="text-3xl font-semibold tracking-tight">ميزة للمشتركين المميّزين</h1>
              <p className="mx-auto mt-2 max-w-sm text-base leading-relaxed text-muted-foreground">
                الاختبارات غير المحدودة والأستاذ بالذكاء الاصطناعي متاحان في العرض المميّز
                بـ<span className="font-semibold text-foreground tabular"> 700 دج </span>شهريًا.
              </p>

              <div className="mt-6 rounded-md border border-border bg-card p-4 text-start">
                <p className="text-sm font-semibold text-muted-foreground">يشمل العرض</p>
                <ul className="mt-2.5 space-y-2 text-base text-muted-foreground">
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    اختبارات تدريب غير محدودة
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    الأستاذ بالذكاء الاصطناعي للرياضيات والفيزياء
                  </li>
                  <li className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    الدروس المميّزة وملخّص شهري لتقدّمك
                  </li>
                </ul>
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <Link to="/pricing">
                  <Button size="lg" className="w-full">عرض الأسعار والاشتراك</Button>
                </Link>
                <Link to="/home">
                  <Button variant="ghost" className="w-full">العودة إلى الرئيسية</Button>
                </Link>
              </div>
            </div>
          </div>
        );
      } else {
        return <Navigate to="/pricing" replace />;
      }
    }
    
    // For other roles, redirect to dashboard
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
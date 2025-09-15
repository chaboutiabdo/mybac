import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
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
  const { isPremium, isAdmin, isFree, loading: subscriptionLoading } = useSubscription();

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    // Check if user has required role or is admin
    const hasAccess = profile.role === requiredRole || profile.role === 'admin' || isAdmin;
    
    // For premium features, show upgrade message or redirect
    if (!hasAccess && requiredRole === 'premium') {
      if (showUpgradeMessage) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">ميزة مميزة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-muted-foreground">
                  هذه الميزة متاحة فقط للمشتركين المميزين. قم بالترقية الآن للوصول إلى جميع الميزات المتقدمة.
                </p>
                <div className="space-y-2">
                  <Link to="/pricing" className="block">
                    <Button className="w-full">ترقية إلى المميز</Button>
                  </Link>
                  <Link to="/home" className="block">
                    <Button variant="outline" className="w-full">العودة للرئيسية</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
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
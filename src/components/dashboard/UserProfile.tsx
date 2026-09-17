import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const UserProfile = () => {
  const { profile } = useAuth();

  if (!profile) return null;

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return "destructive";
      case 'premium':
        return "default";
      default:
        return "secondary";
    }
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return 'مدير';
      case 'premium':
        return 'طالب مميّز';
      default:
        return 'طالب';
    }
  };

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" alt={profile.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{profile.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getRoleBadgeVariant(profile.role)}>
                  {getRoleDisplay(profile.role)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <span className="font-semibold text-2xl">{profile.total_score}</span>
            <span className="text-muted-foreground">نقطة</span>
          </div>
          {profile.stream && (
            <Badge variant="outline">{profile.stream}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfile;
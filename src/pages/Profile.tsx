import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, School, Trophy, BookOpen, Play, Award, Crown, Settings, LogOut } from "lucide-react";
import Navigation from "@/components/layout/Navigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface UserStats {
  totalScore: number;
  quizzesCompleted: number;
  examsSolved: number;
  videosWatched: number;
  rank: number;
  streak: number;
}

const mockUserStats: UserStats = {
  totalScore: 1,
  quizzesCompleted: 15,
  examsSolved: 8,
  videosWatched: 23,
  rank: 12,
  streak: 5
};

const Profile = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const { t, isRTL } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const handleLogin = () => {
    // TODO: Implement actual authentication
    setIsLoggedIn(true);
  };

  const handleSignup = () => {
    // TODO: Implement actual registration
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
  };

  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-background to-secondary/20 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-primary/20">
              <CardHeader className="text-center space-y-2">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">
                  {isLoginMode ? "Welcome Back!" : "Join BAC AI"}
                </CardTitle>
                <CardDescription>
                  {isLoginMode ? "Sign in to continue your learning journey" : "Create your account to start learning"}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {!isLoginMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
                
                {!isLoginMode && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirm Password</label>
                    <Input
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                )}
                
                <Button 
                  onClick={isLoginMode ? handleLogin : handleSignup}
                  className="w-full"
                  size="lg"
                >
                  {isLoginMode ? "Sign In" : "Create Account"}
                </Button>
                
                <div className="text-center">
                  <Button 
                    variant="ghost"
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-sm"
                  >
                    {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background to-secondary/20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-accent/20">
                    JD
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold">John Doe</h1>
                    <Badge variant="default" className="gap-1">
                      <User className="h-3 w-3" />
                      {t("student")}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    john.doe@example.com
                  </p>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <School className="h-4 w-4" />
                    Sciences Stream
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    {t("settings")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("logout")}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div className="text-2xl font-bold text-primary">{mockUserStats.totalScore}</div>
                <div className="text-sm text-muted-foreground">{t("totalScore")}</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-full">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <div className="text-2xl font-bold text-accent">#{mockUserStats.rank}</div>
                <div className="text-sm text-muted-foreground">{t("rank")}</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-success/20 to-success/10 rounded-full">
                  <BookOpen className="h-6 w-6 text-success" />
                </div>
                <div className="text-2xl font-bold text-success">{mockUserStats.streak}</div>
                <div className="text-sm text-muted-foreground">{t("dayStreak")}</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-warning/20 to-warning/10 rounded-full">
                  <Crown className="h-6 w-6 text-warning" />
                </div>
                <div className="text-2xl font-bold text-warning">{t("bronze")}</div>
                <div className="text-sm text-muted-foreground">{t("level")}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {t("learningProgress")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("quizzesCompleted")}</span>
                  <Badge variant="secondary">{mockUserStats.quizzesCompleted}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("examsSolved")}</span>
                  <Badge variant="secondary">{mockUserStats.examsSolved}</Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("videosWatched")}</span>
                  <Badge variant="secondary">{mockUserStats.videosWatched}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-accent" />
                  {t("achievements")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-warning" />
                    <div className="text-xs font-medium">{t("firstQuiz")}</div>
                    <div className="text-xs text-muted-foreground">{t("completed")}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <div className="text-xs font-medium">5 {t("dayStreak")}</div>
                    <div className="text-xs text-muted-foreground">{t("achieved")}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Play className="h-8 w-8 mx-auto mb-2 text-success" />
                    <div className="text-xs font-medium">{t("videoWatcher")}</div>
                    <div className="text-xs text-muted-foreground">20+ {t("videos")}</div>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg opacity-50">
                    <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-xs font-medium">{t("topTen")}</div>
                    <div className="text-xs text-muted-foreground">{t("locked")}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
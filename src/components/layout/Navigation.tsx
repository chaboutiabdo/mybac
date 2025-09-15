import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Brain,
  FileText,
  PlayCircle,
  Users,
  User,
  Settings,
  LogOut,
  Trophy,
  Menu,
  X,
  Moon,
  Sun,
  Globe,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserScore } from "@/hooks/useUserScore";

const Navigation = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { score } = useUserScore();

  const navigationItems = [
    { href: "/home", label: t("home"), icon: Home },
    { href: "/quizzes", label: t("quizzes"), icon: Brain },
    { href: "/exams", label: t("exams"), icon: FileText },
    { href: "/videos", label: t("videos"), icon: PlayCircle },
    { href: "/learn-ai", label: t("aiLearn"), icon: Brain },
    { href: "/alumni", label: t("alumni"), icon: Users },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/home" className="flex items-center space-x-2">
          <img 
            src="/lovable-uploads/2473f7f5-d49d-4abd-8426-94b1d4b3646e.png" 
            alt="THE SMART Logo" 
            className="h-16 w-16 object-contain"
          />
          <span className="font-bold text-xl gradient-hero bg-clip-text text-transparent">
            THE SMART
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className="h-9"
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          ))}
        </div>

        {/* User Profile & Score */}
        <div className="flex items-center space-x-4">
          {/* Score Display */}
          <div className="hidden sm:flex items-center space-x-2">
            <Trophy className="h-4 w-4 text-accent" />
            <Badge variant="secondary" className="bg-accent-light text-accent">
              {score.toLocaleString()} {t("pts")}
            </Badge>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/student.jpg" alt="Student" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    AB
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">Ahmed Benali</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    ahmed.benali@email.com
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <User className="mr-2 h-4 w-4" />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'light' ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    {t("darkMode")}
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    {t("lightMode")}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Globe className="mr-2 h-4 w-4" />
                {t("language")}
              </DropdownMenuItem>
              <div className="px-2 py-1">
                <div className="flex gap-1">
                  <Button
                    variant={language === 'en' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setLanguage('en')}
                  >
                    {t("english")}
                  </Button>
                  <Button
                    variant={language === 'ar' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setLanguage('ar')}
                  >
                    {t("arabic")}
                  </Button>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t("settings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="container py-4">
            <div className="flex flex-col space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              ))}
              <div className="flex items-center justify-center pt-2">
                <Badge variant="secondary" className="bg-accent-light text-accent">
                  <Trophy className="h-3 w-3 mr-1" />
                  {score.toLocaleString()} {t("pts")}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
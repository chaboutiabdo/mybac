import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import LandingPage from "./pages/LandingPage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import LazyLoad from "./components/LazyLoad";
import ProtectedRoute from "./components/ProtectedRoute";
import PerformanceMonitor from "./components/PerformanceMonitor";

// Lazy load heavy components for better performance
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Videos = lazy(() => import("./pages/Videos"));
const Exams = lazy(() => import("./pages/Exams"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const QuizTaking = lazy(() => import("./pages/QuizTaking"));
const Alumni = lazy(() => import("./pages/Alumni"));
const LearnAI = lazy(() => import("./pages/LearnAI"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <TooltipProvider>
            <PerformanceMonitor />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/quizzes" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="premium" showUpgradeMessage={true}>
                      <Quizzes />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/quiz/:attemptId" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <QuizTaking />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/exams" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <Exams />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/videos" element={  
                  <LazyLoad>
                    <ProtectedRoute>
                      <Videos />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/learn-ai" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="premium" showUpgradeMessage={true}>
                      <LearnAI />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/alumni" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <Alumni />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/pricing" element={<Pricing />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

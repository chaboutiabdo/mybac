import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import LandingPage from "./pages/LandingPage";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Pricing from "./pages/Pricing";
import LazyLoad from "./components/LazyLoad";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy load heavy components for better performance
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Videos = lazy(() => import("./pages/Videos"));
const Exams = lazy(() => import("./pages/Exams"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const QuizTaking = lazy(() => import("./pages/QuizTaking"));
const LearnAI = lazy(() => import("./pages/LearnAI"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
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
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* :section is URL-backed so refresh and Back work inside the panel */}
                <Route path="/admin/:section?" element={
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
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

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
import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load heavy components for better performance
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Practice = lazy(() => import("./pages/Practice"));
const Videos = lazy(() => import("./pages/Videos"));
const Exams = lazy(() => import("./pages/Exams"));
const Quizzes = lazy(() => import("./pages/Quizzes"));
const QuizTaking = lazy(() => import("./pages/QuizTaking"));
const LearnAI = lazy(() => import("./pages/LearnAI"));
const MyMistakes = lazy(() => import("./pages/MyMistakes"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const Revision = lazy(() => import("./pages/Revision"));
const ExamSimulator = lazy(() => import("./pages/ExamSimulator"));
const ExamSimulatorTaking = lazy(() => import("./pages/ExamSimulatorTaking"));
const ExamSolution = lazy(() => import("./pages/ExamSolution"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));
const LeaderboardPage = lazy(() => import("./pages/Leaderboard"));
const CalendarPage = lazy(() => import("./pages/Calendar"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
    <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<LandingPage />} />
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
                {/* every signed-in student page sits in the icon-rail frame */}
                <Route element={<AppShell />}>
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
                {/* Directory of practice modes, ungated itself — same pattern as
                    the tiles it replaced: open to view, each tile's own
                    destination still enforces its own gate below. */}
                <Route path="/practice" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <Practice />
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
                <Route path="/exam-simulator" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="premium" showUpgradeMessage={true}>
                      <ExamSimulator />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/exam-simulator/:quizId" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="premium" showUpgradeMessage={true}>
                      <ExamSimulatorTaking />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                {/* The notebook itself is free, like /revision, which showed
                    the same rows all along: the premium wall here was a client
                    gate over a table policy that never had one. What premium
                    buys is the AI explanation, and gemini-chat enforces that
                    server-side. */}
                <Route path="/mistakes" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <MyMistakes />
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
                {/* Flat, matching the only two list->detail pairs in the app
                    (/quiz/:attemptId, /exam-simulator/:quizId). requiredRole
                    here is belt-and-braces: gemini-chat's solve_exam mode is
                    the real gate and enforces premium server-side, exactly as
                    generate_flashcards does for the free /flashcards route. */}
                <Route path="/exam-solution/:examId" element={
                  <LazyLoad>
                    <ProtectedRoute requiredRole="premium" showUpgradeMessage={true}>
                      <ExamSolution />
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
                <Route path="/flashcards" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <Flashcards />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/weekly-report" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <WeeklyReport />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/revision" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <Revision />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                {/* The automatic calendar: nothing is typed in, every square
                    is derived from mistakes.review_due_at and
                    student_flashcard_progress.next_review_at. Free for the
                    same reason /revision and /mistakes are — it renders only
                    rows the student’s own RLS already returns. */}
                <Route path="/calendar" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  </LazyLoad>
                } />
                <Route path="/leaderboard" element={
                  <LazyLoad>
                    <ProtectedRoute>
                      <LeaderboardPage />
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
                </Route>
                <Route path="/pricing" element={<Pricing />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;

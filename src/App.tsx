
import { Suspense, lazy } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { PageTransition } from './components/animations/PageTransition';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { GlobalLoadingIndicator } from './components/shared/GlobalLoadingIndicator';
import { Loader2Icon } from '@/lib/icons';

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const MapView = lazy(() => import("./pages/MapView"));
const DatePlan = lazy(() => import("./pages/DatePlan"));
const Favorites = lazy(() => import("./pages/Favorites"));
// const Chat = lazy(() => import("./pages/Chat")); // Unused import
const Profile = lazy(() => import("./pages/Profile"));
const EditItinerary = lazy(() => import("./pages/EditItinerary"));
const PartyAI = lazy(() => import("./pages/PartyAI"));
const ChatMapView = lazy(() => import("./pages/ChatMapView"));

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2Icon className="w-10 h-10 text-primary animate-spin" />
  </div>
);

const AppRoutes = () => {
  const location = useLocation();

  return (
    <ErrorBoundary>
      <AnimatePresence mode="sync">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <PageTransition key="home">
                <PartyAI />
              </PageTransition>
            } />
            <Route path="/map" element={
              <PageTransition key="map">
                <MapView />
              </PageTransition>
            } />
            <Route path="/old-home" element={
              <PageTransition key="old-home">
                <Index />
              </PageTransition>
            } />
            <Route path="/plan" element={
              <PageTransition key="plan">
                <DatePlan />
              </PageTransition>
            } />
            <Route path="/plan/:id" element={
              <PageTransition key="plan-id">
                <DatePlan />
              </PageTransition>
            } />
            {/* Add route for editing itinerary */}
            <Route path="/plan/edit/:id" element={
              <PageTransition key="plan-edit">
                <EditItinerary />
              </PageTransition>
            } />
            <Route path="/favorites" element={
              <PageTransition key="favorites">
                <Favorites />
              </PageTransition>
            } />
            <Route path="/chat" element={
              <PageTransition key="chat">
                <ChatMapView />
              </PageTransition>
            } />
            <Route path="/profile" element={
              <PageTransition key="profile">
                <Profile />
              </PageTransition>
            } />
            {/* Redirect legacy routes */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="/events" element={<Navigate to="/map" replace />} />
            {/* 404 route */}
            <Route path="*" element={
              <PageTransition key="not-found">
                <NotFound />
              </PageTransition>
            } />
          </Routes>
        </Suspense>
        <Toaster />
      </AnimatePresence>
    </ErrorBoundary>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={0}>
        <AuthProvider>
          <AppRoutes />
          <GlobalLoadingIndicator />
        </AuthProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default App;

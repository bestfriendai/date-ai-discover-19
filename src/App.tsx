
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageTransition } from './components/animations/PageTransition';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MapView from "./pages/MapView";
import DatePlan from "./pages/DatePlan";
import Favorites from "./pages/Favorites";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import EditItinerary from "./pages/EditItinerary";
import PartyAI from "./pages/PartyAI"; // Import PartyAI page
import ChatMapView from "./pages/ChatMapView"; // Import ChatMapView page
import SharedItineraryView from "./pages/SharedItineraryView"; // Import SharedItineraryView page
import UserProfile from "./pages/UserProfile"; // Import UserProfile page
import AIItineraryGenerator from "./pages/AIItineraryGenerator"; // Import AIItineraryGenerator page
import TestNotifications from "./pages/TestNotifications"; // Import TestNotifications page

const App = () => {
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={0}>
      <AuthProvider>
        <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <Index />
          </PageTransition>
        } />
        <Route path="/map" element={
          <PageTransition>
            <MapView />
          </PageTransition>
        } />
        <Route path="/party" element={
          <PageTransition>
            <PartyAI />
          </PageTransition>
        } />
        <Route path="/plan" element={
          <PageTransition>
            <DatePlan />
          </PageTransition>
        } />
        <Route path="/plan/:id" element={
          <PageTransition>
            <DatePlan />
          </PageTransition>
        } />
        {/* Add route for editing itinerary */}
        <Route path="/plan/edit/:id" element={
          <PageTransition>
            <EditItinerary />
          </PageTransition>
        } />
        <Route path="/shared-plan/:id" element={
          <PageTransition>
            <SharedItineraryView />
          </PageTransition>
        } />
        <Route path="/profile" element={
          <PageTransition>
            <UserProfile />
          </PageTransition>
        } />
        <Route path="/profile/:id" element={
          <PageTransition>
            <UserProfile />
          </PageTransition>
        } />
        <Route path="/plan/ai-generator" element={
          <PageTransition>
            <AIItineraryGenerator />
          </PageTransition>
        } />
        <Route path="/test-notifications" element={
          <PageTransition>
            <TestNotifications />
          </PageTransition>
        } />
        <Route path="/favorites" element={
          <PageTransition>
            <Favorites />
          </PageTransition>
        } />
        <Route path="/chat" element={
          <PageTransition>
            <ChatMapView />
          </PageTransition>
        } />
        {/* Old Profile route removed to avoid duplication */}
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
        </Routes>
        <Toaster />
      </AnimatePresence>
    </AuthProvider>
    </TooltipProvider>
  );
};

export default App;

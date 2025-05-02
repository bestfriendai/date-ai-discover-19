
import { AnimatePresence } from 'framer-motion';
import { Routes, Route, useLocation } from 'react-router-dom';
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
import PartyAI from "./pages/PartyAI";
import ChatMapView from "./pages/ChatMapView";

const AppRoutes = () => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <PartyAI />
          </PageTransition>
        } />
        <Route path="/map" element={
          <PageTransition>
            <MapView />
          </PageTransition>
        } />
        <Route path="/old-home" element={
          <PageTransition>
            <Index />
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
        <Route path="/profile" element={
          <PageTransition>
            <Profile />
          </PageTransition>
        } />
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
      <Toaster />
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <TooltipProvider delayDuration={0}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  );
};

export default App;

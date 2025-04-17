
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageTransition } from './components/animations/PageTransition';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from './components/ui/toaster';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MapView from "./pages/MapView";
import DatePlan from "./pages/DatePlan";
import Favorites from "./pages/Favorites";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";

const App = () => {
  const location = useLocation();

  return (
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
        <Route path="/favorites" element={
          <PageTransition>
            <Favorites />
          </PageTransition>
        } />
        <Route path="/chat" element={
          <PageTransition>
            <Chat />
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
    </AuthProvider>
  );
};

export default App;

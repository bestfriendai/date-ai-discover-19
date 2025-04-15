
import { AnimatePresence } from 'framer-motion';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PageTransition } from './components/animations/PageTransition';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MapView from "./pages/MapView";
import DatePlan from "./pages/DatePlan";
import Favorites from "./pages/Favorites";

const App = () => {
  const location = useLocation();

  return (
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
        <Route path="/favorites" element={
          <PageTransition>
            <Favorites />
          </PageTransition>
        } />
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
};

export default App;

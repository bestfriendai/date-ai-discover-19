import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, LogOut, Heart, Calendar, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/auth/AuthModal';
import NotificationCenter from '@/components/notifications/NotificationCenter';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    // Use CSS variable for background to respect theme, keep opacity/blur
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-xl shadow-lg">
      <div className="container flex items-center justify-between h-16 px-6 mx-auto py-2">
        <div className="flex items-center">
          <Link to="/" className="flex items-center mr-6 group">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2.5 mr-3 shadow-lg shadow-blue-500/30 group-hover:shadow-xl group-hover:shadow-blue-500/50 transition-all duration-300 transform group-hover:scale-110">
              {/* Updated Party/Crowd Icon SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="6.5" cy="10.5" r="2.5" />
                <circle cx="17.5" cy="10.5" r="2.5" />
                <circle cx="12" cy="7" r="2.5" />
                <path d="M2 20c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
                <path d="M11.5 20c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
                <path d="M8.5 16c.7-1.5 2.3-2.5 3.5-2.5s2.8 1 3.5 2.5" />
              </svg>
            </div>
            <div className="flex items-center">
              <span className="font-bold text-xl bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">FomoAI</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-3">
            <Link to="/map">
              <Button
                variant={location.pathname === '/map' ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 rounded-full px-4 transition-all duration-300 ${location.pathname === '/map' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30' : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                Map
              </Button>
            </Link>
            <Link to="/party">
              <Button
                variant={location.pathname === '/party' ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 rounded-full px-4 transition-all duration-300 ${location.pathname === '/party' ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white hover:from-purple-700 hover:via-pink-600 hover:to-red-600 shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30' : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" /><path d="M15 2h.01" /><path d="M22 20h.01" /><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" /><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" /><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" /><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z" /></svg>
                PartyAI
              </Button>
            </Link>
            <Link to="/chat">
              <Button
                variant={location.pathname === '/chat' ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 rounded-full px-4 transition-all duration-300 ${location.pathname === '/chat' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30' : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
                Event Chat
              </Button>
            </Link>
            <Link to="/plan">
              <Button
                variant={location.pathname === '/plan' ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 rounded-full px-4 transition-all duration-300 ${location.pathname === '/plan' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30' : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                Date Plan
              </Button>
            </Link>
            <Link to="/favorites">
              <Button
                variant={location.pathname === '/favorites' ? 'default' : 'ghost'}
                size="sm"
                className={`gap-2 rounded-full px-4 transition-all duration-300 ${location.pathname === '/favorites' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30' : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                Favorites
              </Button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="hidden md:flex hover:bg-slate-800/70 transition-all duration-300 text-slate-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </Button>

          {!loading && user && (
            <NotificationCenter />
          )}

          {!loading && (
            user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-800/70 transition-all duration-300">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user.user_metadata?.full_name && (
                        <p className="font-medium">{user.user_metadata.full_name}</p>
                      )}
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Favorites</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/plan')} className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>My Itineraries</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/plan/ai-generator')} className="cursor-pointer">
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>AI Itinerary Generator</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" size="sm" className="gap-2 rounded-full border-blue-500/30 hover:bg-blue-500/10 hover:text-white transition-all duration-300" onClick={() => setShowAuthModal(true)}>
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={() => setShowAuthModal(false)}
      />
    </header>
  );
};

export default Header;

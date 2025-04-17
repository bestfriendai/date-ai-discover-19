import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, User, MapPin, Heart, Calendar, Settings, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getFavorites } from '@/services/favoriteService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  default_location?: string;
  preferred_categories?: string[];
  email_notifications?: boolean;
}

const Profile = () => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [defaultLocation, setDefaultLocation] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize form values when profile data is loaded
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setDefaultLocation(profile.default_location || '');
      setPreferredCategories(profile.preferred_categories || []);
      setEmailNotifications(profile.email_notifications || false);
    }
  }, [profile]);

  // Fetch favorite count
  const fetchFavoriteCount = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingFavorites(true);
      const favorites = await getFavorites();
      setFavoriteCount(favorites.length);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoadingFavorites(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavoriteCount();
  }, [fetchFavoriteCount]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to view your profile.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [loading, user, navigate, toast]);

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      if (!user?.id) {
        throw new Error('User ID not found');
      }

      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        default_location: defaultLocation,
        preferred_categories: preferredCategories,
        email_notifications: emailNotifications,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.'
      });

      // Refresh profile data
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle category selection
  const handleCategoryToggle = (category: string) => {
    setPreferredCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
      toast({
        title: 'Signed Out',
        description: 'You have been successfully signed out.'
      });
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Sign Out Failed',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 container max-w-4xl mx-auto pt-20 px-4 pb-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Update your personal details and how you appear on the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Your username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultLocation">Default Location</Label>
                  <div className="flex gap-2">
                    <Input
                      id="defaultLocation"
                      value={defaultLocation}
                      onChange={(e) => setDefaultLocation(e.target.value)}
                      placeholder="e.g., New York, NY"
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This location will be used as the default when searching for events.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Date Preferences</CardTitle>
                <CardDescription>
                  Customize your experience and get more relevant date suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Preferred Event Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {['music', 'arts', 'sports', 'food', 'family'].map((category) => (
                      <Badge
                        key={category}
                        variant={preferredCategories.includes(category) ? "default" : "outline"}
                        className={`capitalize cursor-pointer ${
                          preferredCategories.includes(category) ? "" : "hover:bg-secondary"
                        }`}
                        onClick={() => handleCategoryToggle(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select categories you're interested in to get better event recommendations.
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Notifications</Label>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-medium">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">
                        Receive emails about new events matching your preferences.
                      </div>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>Favorite Events</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You have {loadingFavorites ? '...' : favoriteCount} favorite events.
              </p>
              <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/favorites')}>
                View all favorites
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle>My Itineraries</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You have {profile?.id ? '0' : '0'} saved itineraries.
              </p>
              <Button variant="link" className="px-0 mt-2" onClick={() => navigate('/plan')}>
                View all itineraries
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;

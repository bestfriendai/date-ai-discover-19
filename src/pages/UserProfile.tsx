import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Users, UserPlus, UserMinus, Calendar, MapPin, ExternalLink, Edit, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import followService, { UserProfile as UserProfileType } from '@/services/followService';
import { getFavorites } from '@/services/favoriteService';
import { getItineraries } from '@/services/itineraryService';
import { Event, Itinerary } from '@/types';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followers, setFollowers] = useState<UserProfileType[]>([]);
  const [following, setFollowing] = useState<UserProfileType[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [favoriteEvents, setFavoriteEvents] = useState<Event[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [activeTab, setActiveTab] = useState('favorites');

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfileType>>({});

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (!id) {
          // If no ID is provided, use the current user's ID
          if (user) {
            const userProfile = await followService.getUserProfile(user.id);
            setProfile(userProfile);
          } else {
            navigate('/login');
          }
        } else {
          const userProfile = await followService.getUserProfile(id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user profile',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user, navigate]);

  // Fetch favorites and itineraries
  useEffect(() => {
    const fetchUserContent = async () => {
      if (!profile) return;

      // Check if this is the current user or if the profile is public
      const isCurrentUser = user && user.id === profile.id;
      const isPublic = profile.profile_visibility === 'public';
      const isFollower = profile.is_following;
      const canViewContent = isCurrentUser || isPublic || (profile.profile_visibility === 'followers' && isFollower);

      if (canViewContent) {
        try {
          if (isCurrentUser) {
            // Fetch current user's content
            const [favoritesData, itinerariesData] = await Promise.all([
              getFavorites(),
              getItineraries()
            ]);

            setFavoriteEvents(favoritesData);
            setItineraries(itinerariesData);
          } else {
            // Fetch other user's public content
            try {
              // Get public favorites
              const { data: publicFavorites, error: favoritesError } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_public', true);

              if (favoritesError) throw favoritesError;
              setFavoriteEvents(publicFavorites || []);

              // Get public itineraries
              const { data: publicItineraries, error: itinerariesError } = await supabase
                .from('itineraries')
                .select('*')
                .eq('user_id', profile.id)
                .eq('is_public', true);

              if (itinerariesError) throw itinerariesError;
              setItineraries(publicItineraries || []);
            } catch (error) {
              console.error('Error fetching public content:', error);
            }
          }
        } catch (error) {
          console.error('Error fetching user content:', error);
        }
      }
    };

    fetchUserContent();
  }, [profile, user]);

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!profile || !user) return;

    setFollowLoading(true);
    try {
      if (profile.is_following) {
        await followService.unfollowUser(profile.id);
        setProfile(prev => prev ? { ...prev, is_following: false, follower_count: (prev.follower_count || 0) - 1 } : null);
        toast({ title: `Unfollowed ${profile.full_name || profile.username || 'user'}` });
      } else {
        await followService.followUser(profile.id);
        setProfile(prev => prev ? { ...prev, is_following: true, follower_count: (prev.follower_count || 0) + 1 } : null);
        toast({ title: `Following ${profile.full_name || profile.username || 'user'}` });
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: 'Error',
        description: 'Failed to update follow status',
        variant: 'destructive'
      });
    } finally {
      setFollowLoading(false);
    }
  };

  // Load followers
  const handleShowFollowers = async () => {
    if (!profile) return;

    try {
      const followersData = await followService.getFollowers(profile.id);
      setFollowers(followersData);
      setShowFollowers(true);
      setShowFollowing(false);
    } catch (error) {
      console.error('Error fetching followers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load followers',
        variant: 'destructive'
      });
    }
  };

  // Load following
  const handleShowFollowing = async () => {
    if (!profile) return;

    try {
      const followingData = await followService.getFollowing(profile.id);
      setFollowing(followingData);
      setShowFollowing(true);
      setShowFollowers(false);
    } catch (error) {
      console.error('Error fetching following:', error);
      toast({
        title: 'Error',
        description: 'Failed to load following users',
        variant: 'destructive'
      });
    }
  };

  // Handle profile edit
  const handleEditProfile = () => {
    if (!profile) return;

    setEditedProfile({
      full_name: profile.full_name,
      username: profile.username,
      bio: profile.bio,
      profile_visibility: profile.profile_visibility,
      social_links: profile.social_links
    });

    setIsEditMode(true);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    try {
      const updatedProfile = await followService.updateUserProfile(editedProfile);
      if (updatedProfile) {
        setProfile(prev => prev ? { ...prev, ...updatedProfile } : updatedProfile);
        toast({ title: 'Profile updated successfully' });
      }
      setIsEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    }
  };

  // Cancel profile edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedProfile({});
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
        <p className="mb-4">The user profile you're looking for doesn't exist or is not accessible.</p>
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    );
  }

  const isCurrentUser = user && user.id === profile.id;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            <Avatar className="h-24 w-24 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.full_name?.charAt(0) || profile.username?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              {isEditMode ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Name</Label>
                    <Input
                      id="full_name"
                      value={editedProfile.full_name || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={editedProfile.username || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="username"
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={editedProfile.bio || ''}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="visibility">Profile Visibility</Label>
                    <select
                      id="visibility"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={editedProfile.profile_visibility || 'public'}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, profile_visibility: e.target.value as 'public' | 'followers' | 'private' }))}
                    >
                      <option value="public">Public</option>
                      <option value="followers">Followers Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile}>
                      <Check className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{profile.full_name || 'Unnamed User'}</h2>
                      {profile.username && <p className="text-muted-foreground">@{profile.username}</p>}
                    </div>

                    {isCurrentUser ? (
                      <Button variant="outline" size="sm" onClick={handleEditProfile}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <Button
                        variant={profile.is_following ? "outline" : "default"}
                        size="sm"
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                      >
                        {followLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : profile.is_following ? (
                          <UserMinus className="h-4 w-4 mr-2" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {profile.is_following ? 'Unfollow' : 'Follow'}
                      </Button>
                    )}
                  </div>

                  {profile.bio && (
                    <p className="mt-2 text-sm">{profile.bio}</p>
                  )}

                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={handleShowFollowers}
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      <strong>{profile.follower_count || 0}</strong> Followers
                    </button>
                    <button
                      onClick={handleShowFollowing}
                      className="text-sm hover:underline flex items-center gap-1"
                    >
                      <strong>{profile.following_count || 0}</strong> Following
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Followers/Following Modal */}
          {(showFollowers || showFollowing) && (
            <div className="mb-6 border rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  {showFollowers ? 'Followers' : 'Following'}
                </h3>
                <Button variant="ghost" size="sm" onClick={() => { setShowFollowers(false); setShowFollowing(false); }}>
                  ×
                </Button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {(showFollowers ? followers : following).length > 0 ? (
                  (showFollowers ? followers : following).map(user => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name?.charAt(0) || user.username?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link to={`/profile/${user.id}`} className="font-medium hover:underline">
                            {user.full_name || 'Unnamed User'}
                          </Link>
                          {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
                        </div>
                      </div>

                      {user.id !== profile.id && (
                        <Button
                          variant={user.is_following ? "outline" : "default"}
                          size="sm"
                          onClick={async () => {
                            if (user.is_following) {
                              await followService.unfollowUser(user.id);
                              // Update the user in the list
                              const updatedList = (showFollowers ? followers : following).map(u =>
                                u.id === user.id ? { ...u, is_following: false } : u
                              );
                              showFollowers ? setFollowers(updatedList) : setFollowing(updatedList);
                            } else {
                              await followService.followUser(user.id);
                              // Update the user in the list
                              const updatedList = (showFollowers ? followers : following).map(u =>
                                u.id === user.id ? { ...u, is_following: true } : u
                              );
                              showFollowers ? setFollowers(updatedList) : setFollowing(updatedList);
                            }
                          }}
                        >
                          {user.is_following ? 'Unfollow' : 'Follow'}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    {showFollowers ? 'No followers yet' : 'Not following anyone yet'}
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="itineraries">Itineraries</TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="mt-4">
              {isCurrentUser || profile.profile_visibility === 'public' ||
               (profile.profile_visibility === 'followers' && profile.is_following) ? (
                <div className="space-y-4">
                  {favoriteEvents.length > 0 ? (
                    favoriteEvents.map(event => (
                      <Card key={event.id} className="overflow-hidden hover:bg-accent/5 transition">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="h-20 w-20 rounded-md overflow-hidden bg-accent/10 flex-shrink-0">
                              <img
                                src={event.image}
                                alt={event.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).onerror = null;
                                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                                }}
                              />
                            </div>
                            <div className="flex-1">
                              <Link to={`/map?selectedEventId=${event.id}`} className="font-medium hover:underline">
                                {event.title}
                              </Link>
                              <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{event.date}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                              </div>
                              {event.price && (
                                <div className="text-sm mt-1">
                                  Price: {event.price}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No favorite events yet.</p>
                      {isCurrentUser && (
                        <Button asChild className="mt-4" variant="outline">
                          <Link to="/map">Discover Events</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>This user's favorites are private.</p>
                  {profile.profile_visibility === 'followers' && !profile.is_following && (
                    <Button onClick={handleFollowToggle} className="mt-4">
                      Follow to See Favorites
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="itineraries" className="mt-4">
              {isCurrentUser || profile.profile_visibility === 'public' ||
               (profile.profile_visibility === 'followers' && profile.is_following) ? (
                <div className="space-y-4">
                  {itineraries.length > 0 ? (
                    itineraries.filter(itinerary => isCurrentUser || itinerary.is_public).map(itinerary => (
                      <Card key={itinerary.id} className="overflow-hidden hover:bg-accent/5 transition">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link to={`/plan/edit/${itinerary.id}`} className="font-medium hover:underline">
                                {itinerary.name || 'Unnamed Itinerary'}
                              </Link>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(itinerary.date).toLocaleDateString()}</span>
                                {itinerary.is_public && <span className="text-xs bg-primary/10 px-2 py-0.5 rounded-full">Public</span>}
                              </div>
                              {itinerary.description && (
                                <p className="text-sm mt-2 line-clamp-2">{itinerary.description}</p>
                              )}
                            </div>

                            {itinerary.is_public && (
                              <Button asChild variant="ghost" size="sm">
                                <Link to={`/shared-plan/${itinerary.id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No itineraries yet.</p>
                      {isCurrentUser && (
                        <Button asChild className="mt-4" variant="outline">
                          <Link to="/plan/new">Create Itinerary</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>This user's itineraries are private.</p>
                  {profile.profile_visibility === 'followers' && !profile.is_following && (
                    <Button onClick={handleFollowToggle} className="mt-4">
                      Follow to See Itineraries
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;

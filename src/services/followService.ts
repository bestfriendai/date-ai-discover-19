import { supabase } from '@/integrations/supabase/client';
import errorReporter from '@/utils/errorReporter';

export interface UserProfile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  profile_visibility?: 'public' | 'followers' | 'private';
  social_links?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    [key: string]: string | undefined;
  };
  created_at?: string;
  updated_at?: string;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    if (existingFollow) {
      return true; // Already following
    }

    const { error } = await supabase
      .from('followers')
      .insert({
        follower_id: user.id,
        following_id: userId
      });

    if (error) {
      console.error('Error following user:', error);
      errorReporter('Error following user:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error following user:', error);
    errorReporter('Error following user:', error);
    return false;
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) {
      console.error('Error unfollowing user:', error);
      errorReporter('Error unfollowing user:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    errorReporter('Error unfollowing user:', error);
    return false;
  }
}

/**
 * Check if the current user is following another user
 */
export async function isFollowing(userId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" - this is fine
      console.error('Error checking follow status:', error);
      errorReporter('Error checking follow status:', error);
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking follow status:', error);
    errorReporter('Error checking follow status:', error);
    return false;
  }
}

/**
 * Get a user's followers
 */
export async function getFollowers(userId: string): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('follower:follower_id(id, username, full_name, avatar_url, profile_visibility)')
      .eq('following_id', userId);

    if (error) {
      console.error('Error getting followers:', error);
      errorReporter('Error getting followers:', error);
      throw error;
    }

    // Check if the current user is following each of these followers (for mutual follows)
    const { data: { user } } = await supabase.auth.getUser();
    const followers = data.map(item => item.follower) as UserProfile[];

    if (user) {
      // Get all users that the current user is following
      const { data: following } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingSet = new Set(following?.map(f => f.following_id) || []);

      // Mark which followers the current user is also following
      followers.forEach(follower => {
        follower.is_following = followingSet.has(follower.id);
      });
    }

    return followers;
  } catch (error) {
    console.error('Error getting followers:', error);
    errorReporter('Error getting followers:', error);
    return [];
  }
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase
      .from('followers')
      .select('following:following_id(id, username, full_name, avatar_url, profile_visibility)')
      .eq('follower_id', userId);

    if (error) {
      console.error('Error getting following:', error);
      errorReporter('Error getting following:', error);
      throw error;
    }

    // For the current user, mark all as being followed (since this is the following list)
    const { data: { user } } = await supabase.auth.getUser();
    const following = data.map(item => item.following) as UserProfile[];

    if (user && user.id === userId) {
      following.forEach(profile => {
        profile.is_following = true;
      });
    } else if (user) {
      // For other users, check which ones the current user is also following
      const { data: currentUserFollowing } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingSet = new Set(currentUserFollowing?.map(f => f.following_id) || []);

      following.forEach(profile => {
        profile.is_following = followingSet.has(profile.id);
      });
    }

    return following;
  } catch (error) {
    console.error('Error getting following:', error);
    errorReporter('Error getting following:', error);
    return [];
  }
}

/**
 * Get a user's profile with follower counts
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // Get the user's profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting user profile:', error);
      errorReporter('Error getting user profile:', error);
      throw error;
    }

    // Get follower count
    const { count: followerCount, error: followerError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (followerError) {
      console.error('Error getting follower count:', followerError);
      errorReporter('Error getting follower count:', followerError);
    }

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (followingError) {
      console.error('Error getting following count:', followingError);
      errorReporter('Error getting following count:', followingError);
    }

    // Check if the current user is following this user
    const { data: { user } } = await supabase.auth.getUser();
    let isFollowingUser = false;

    if (user && user.id !== userId) {
      isFollowingUser = await isFollowing(userId);
    }

    return {
      ...profile,
      follower_count: followerCount || 0,
      following_count: followingCount || 0,
      is_following: isFollowingUser
    };
  } catch (error) {
    console.error('Error getting user profile with counts:', error);
    errorReporter('Error getting user profile with counts:', error);
    return null;
  }
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Remove fields that shouldn't be directly updated
    const { id, created_at, updated_at, is_following, follower_count, following_count, ...updateData } = profileData;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      errorReporter('Error updating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    errorReporter('Error updating user profile:', error);
    return null;
  }
}

// Export default object for easier imports
const followService = {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getUserProfile,
  updateUserProfile
};

export default followService;

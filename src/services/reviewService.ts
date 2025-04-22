import { supabase } from '@/integrations/supabase/client';
import errorReporter from '@/utils/errorReporter';

export interface ReviewData {
  event_id: string;
  rating: number;
  review_text?: string;
}

export interface Review {
  id: string;
  event_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  // Include user details
  user?: { full_name: string; avatar_url?: string };
}

/**
 * Submit a review for an event
 */
export async function submitReview(reviewData: ReviewData): Promise<Review | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('event_reviews')
      .upsert({ ...reviewData, user_id: user.id }) // Upsert allows updating if a review already exists for this event/user
      .select('*')
      .single();

    if (error) {
      console.error('Error submitting review:', error);
      errorReporter('Error submitting review:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error submitting review:', error);
    errorReporter('Error submitting review:', error);
    return null;
  }
}

/**
 * Get reviews for an event
 */
export async function getReviewsForEvent(eventId: string): Promise<Review[]> {
  try {
    // We want to also get the user's name for the review display
    const { data, error } = await supabase
      .from('event_reviews')
      .select('*, user:user_id(full_name, avatar_url)') // Select user details from profiles table via user_id foreign key
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
      errorReporter('Error fetching reviews:', error);
      throw error;
    }

    // Map the data to include the user details nicely
    return data.map(review => ({
      ...review,
      user: review.user as { full_name: string; avatar_url?: string } // Cast to expected shape
    })) as Review[];
  } catch (error) {
    console.error('Error fetching reviews:', error);
    errorReporter('Error fetching reviews:', error);
    return [];
  }
}

/**
 * Get the average rating for an event
 */
export async function getAverageRatingForEvent(eventId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('event_reviews')
      .select('rating')
      .eq('event_id', eventId);

    if (error) {
      console.error('Error fetching ratings for average:', error);
      errorReporter('Error fetching ratings for average:', error);
      throw error;
    }

    if (!data || data.length === 0) return null;

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / data.length;
  } catch (error) {
    console.error('Error calculating average rating:', error);
    errorReporter('Error calculating average rating:', error);
    return null;
  }
}

/**
 * Get a user's review for an event
 */
export async function getUserReviewForEvent(eventId: string): Promise<Review | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('event_reviews')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No review found
        return null;
      }
      console.error('Error fetching user review:', error);
      errorReporter('Error fetching user review:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching user review:', error);
    errorReporter('Error fetching user review:', error);
    return null;
  }
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('event_reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      console.error('Error deleting review:', error);
      errorReporter('Error deleting review:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting review:', error);
    errorReporter('Error deleting review:', error);
    return false;
  }
}

// Export default object for easier imports
const reviewService = {
  submitReview,
  getReviewsForEvent,
  getAverageRatingForEvent,
  getUserReviewForEvent,
  deleteReview
};

export default reviewService;

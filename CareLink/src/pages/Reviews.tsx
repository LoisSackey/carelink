// Import Header layout component for navigation
import Header from "@/components/layout/Header";
// Import Footer layout component for footer content
import Footer from "@/components/layout/Footer";
// Import Button UI component for submit actions
import { Button } from "@/components/ui/button";
// Import icon components for ratings and user interactions
import { Star, Users, ThumbsUp, MessageSquare } from "lucide-react";
// Import useState hook for managing review form state
import { useState } from "react";
// Import useToast hook for notifications
import { useToast } from "@/hooks/use-toast";

// Reviews component - Displays caregiver reviews and ratings, allows users to submit new reviews
const Reviews = () => {
  const { toast } = useToast();

  // newReview state - Stores rating and text for a review being written by user
  const [newReview, setNewReview] = useState({
    rating: 0,    // Star rating from 0-5
    text: ""      // Review text content
  });

  // isSubmitting state - Tracks whether review is being submitted
  const [isSubmitting, setIsSubmitting] = useState(false);

  // reviews state - List of caregiver reviews with rating, date, and helpful count
  const [reviews, setReviews] = useState([
    {
      id: 1,
      caregiver: "Ama Mensah",
      rating: 5,
      date: "Jan 5, 2026",
      text: "Ama was absolutely wonderful with my mother. She showed great patience and compassion throughout her care. Highly recommended!",
      helpful: 12
    },
    {
      id: 2,
      caregiver: "Akosua Boateng",
      rating: 5,
      date: "Dec 28, 2025",
      text: "Excellent childcare provider. My kids loved her! Very professional and reliable.",
      helpful: 8
    },
    {
      id: 3,
      caregiver: "Kofi Osei",
      rating: 4,
      date: "Dec 15, 2025",
      text: "Kofi provided great support during my father's recovery. Very knowledgeable about physical therapy exercises.",
      helpful: 5
    }
  ]);

  // averageRating calculation - Compute average from all reviews
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  // totalReviews calculation - Count of all reviews
  const totalReviews = reviews.length;

  // handleSubmitReview function - Processes form submission and adds review to list
  const handleSubmitReview = async () => {
    if (!newReview.rating) {
      toast({
        title: "Error",
        description: "Please provide a rating",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create new review object
      const newReviewObj = {
        id: Math.max(...reviews.map(r => r.id), 0) + 1,
        caregiver: localStorage.getItem("caregiverName") || "Anonymous Caregiver",
        rating: newReview.rating,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        text: newReview.text,
        helpful: 0
      };

      // Add review to list
      setReviews([newReviewObj, ...reviews]);

      // Reset form
      setNewReview({ rating: 0, text: "" });

      toast({
        title: "Success",
        description: "Your review has been submitted!",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // handleHelpfulClick function - Increments helpful count for a review
  const handleHelpfulClick = (reviewId: number) => {
    setReviews(reviews.map(review =>
      review.id === reviewId
        ? { ...review, helpful: review.helpful + 1 }
        : review
    ));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="section-padding">
        <div className="container-main max-w-4xl">
          <h1 className="text-3xl font-bold text-foreground mb-8">Reviews & Ratings</h1>

          {/* Stats */}
          <div className="card-elevated p-8 mb-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-foreground">{averageRating}</p>
                <div className="flex justify-center gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-5 w-5 ${i < Math.round(averageRating) ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <p className="text-muted-foreground">Average Rating</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">{totalReviews}</p>
                <p className="text-muted-foreground mt-2">Total Reviews</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-foreground">98%</p>
                <p className="text-muted-foreground mt-2">Recommend</p>
              </div>
            </div>
          </div>

          {/* Write Review */}
          <div className="card-elevated p-6 mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Write a Review
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Your Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setNewReview({ ...newReview, rating: star })}
                    className="p-1"
                  >
                    <Star className={`h-8 w-8 transition-colors ${
                      star <= newReview.rating 
                        ? "fill-warning text-warning" 
                        : "text-muted-foreground hover:text-warning"
                    }`} />
                  </button>
                ))}
              </div>
              <Button 
                onClick={handleSubmitReview}
                disabled={!newReview.rating || isSubmitting}
                className="mt-3"
                size="sm"
              >
                {isSubmitting ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Your Review <span className="text-muted-foreground">(optional)</span></label>
              <textarea
                value={newReview.text}
                onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
                className="input-base min-h-[100px] resize-none"
                placeholder="Share your experience... (optional)"
              />
            </div>
            <Button 
              onClick={handleSubmitReview}
              disabled={!newReview.rating || isSubmitting}
              variant="outline"
            >
              {isSubmitting ? "Submitting..." : "Submit Review with Text"}
            </Button>
          </div>

          {/* Reviews List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Reviews</h2>
            {reviews.map((review) => (
              <div key={review.id} className="card-elevated p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Review for {review.caregiver}</p>
                      <p className="text-sm text-muted-foreground">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">{review.text}</p>
                <button 
                  onClick={() => handleHelpfulClick(review.id)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({review.helpful})
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Reviews;

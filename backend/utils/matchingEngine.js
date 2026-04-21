import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';


 
 //Uses KNN to find caregivers most similar to family requirements using location and service


class MatchingEngine {
  constructor() {
    this.k = 5; // Default k value for KNN
  }

   //Convert caregiver to feature vector for KNN

  caregiverToFeatureVector(caregiver, familyNeeds = null) {
    const experience = this.extractYearsFromBio(caregiver.bio) || 5;
    const rating = caregiver.rating || 0;
    const dailyRate = caregiver.dailyRate || 0;
    const verificationScore = this.calculateVerificationScore(caregiver, null);
    const skillCount = (caregiver.certifications || []).length;

    // Location score relative to family needs (if provided)
    let locationScore = 50; // Default neutral score
    if (familyNeeds) {
      locationScore = this.calculateLocationScore(
        caregiver.city,
        caregiver.state,
        familyNeeds.city,
        familyNeeds.state
      );
    }

    return {
      id: caregiver._id,
      features: [
        experience / 20,        // Normalize experience (0-1)
        rating / 5,            // Normalize rating (0-1)
        dailyRate / 200,       // Normalize price (0-1, assuming max 200)
        verificationScore / 15, // Normalize verification (0-1)
        skillCount / 10,       // Normalize skills (0-1, assuming max 10)
        locationScore / 100    // Normalize location (0-1)
      ],
      caregiver: caregiver
    };
  }

  /**
   * Calculate Euclidean distance between two feature vectors
   */
  calculateDistance(vector1, vector2) {
    if (vector1.length !== vector2.length) {
      throw new Error('Feature vectors must have same length');
    }

    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.pow(vector1[i] - vector2[i], 2);
    }
    return Math.sqrt(sum);
  }

  /**
   * K-Nearest Neighbors algorithm
   * 
   */
  findKNearestNeighbors(trainingData, testVector, k = this.k) {
    // Calculate distances to all training points
    const distances = trainingData.map(data => ({
      ...data,
      distance: this.calculateDistance(data.features, testVector)
    }));

    // Sort by distance (ascending)
    distances.sort((a, b) => a.distance - b.distance);

    // Return k nearest neighbors
    return distances.slice(0, k);
  }

  /**
   * Create feature vector from family requirements
   */
  familyNeedsToFeatureVector(familyNeeds) {
    const experience = familyNeeds.requiredExperience || 5;
    const budget = familyNeeds.budgetDaily || 100;
    const requiredSkills = (familyNeeds.requiredSkills || []).length;

    // For family needs, we use ideal values
    return [
      experience / 20,        // Required experience
      1.0,                   // Perfect rating desired
      budget / 200,          // Budget
      1.0,                   // Full verification desired
      requiredSkills / 10,   // Required skills count
      1.0                    // Perfect location match desired
    ];
  }

  /**
   * Calculate match score using KNN
   * Score based on average distance to k nearest neighbors (lower distance = higher score)
   */
  calculateKNNMatchScore(caregiverVector, familyVector, allCaregivers) {
    const neighbors = this.findKNearestNeighbors(allCaregivers, familyVector, this.k);

    // Find how close this caregiver is to the family requirements
    const distanceToFamily = this.calculateDistance(caregiverVector.features, familyVector);

    // Score inversely proportional to distance 
    // Max score = 100, min score = 0
    const maxDistance = Math.sqrt(6); // Maximum possible distance for 6 features (0-1 range)
    const score = Math.max(0, (maxDistance - distanceToFamily) / maxDistance * 100);

    return {
      score: Math.round(score),
      distance: distanceToFamily,
      rank: neighbors.findIndex(n => n.id === caregiverVector.id) + 1
    };
  }

  /**
   * Calculate experience score based on years and service type
   */
  calculateExperienceScore(caregiver, requiredServiceType) {
    let score = 0;

    // Parse experience from bio or use rating count as proxy
    const yearsOfExperience = this.extractYearsFromBio(caregiver.bio) || 5;
    
    // Base score: 0-20 points
    if (yearsOfExperience >= 10) {
      score += 20;
    } else if (yearsOfExperience >= 5) {
      score += 15;
    } else if (yearsOfExperience >= 2) {
      score += 10;
    } else {
      score += 5;
    }

    // Service type 
    if (caregiver.serviceType && requiredServiceType) {
      if (caregiver.serviceType.toLowerCase() === requiredServiceType.toLowerCase()) {
        score += 10; // Exact match bonus
      } else if (this.isRelatedService(caregiver.serviceType, requiredServiceType)) {
        score += 5; // Related service bonus
      }
    }

    return Math.min(score, 20); 
  }

  /**
   * Extract years of experience from bio text
   */
  extractYearsFromBio(bio) {
    if (!bio) return null;
    
    // Look for patterns like "5 years", "10+ years", "20 years of experience"
    const match = bio.match(/(\d+)\s*\+?\s*years/i);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Check if two service types are related
   */
  isRelatedService(type1, type2) {
    const relatedServices = {
      eldercare: ['senior-care', 'mobility-assistance', 'physical-therapy'],
      childcare: ['infant-care', 'childcare', 'nanny-services'],
      nursing: ['nursing-care', 'medical-care', 'post-operative-care'],
      therapy: ['physical-therapy', 'occupational-therapy', 'rehabilitation'],
    };

    const normalized1 = type1.toLowerCase().replace(/[_-]/g, '');
    const normalized2 = type2.toLowerCase().replace(/[_-]/g, '');

    for (const [main, related] of Object.entries(relatedServices)) {
      if (normalized1.includes(main.replace(/[_-]/g, '')) && 
          related.some(r => normalized2.includes(r.replace(/[_-]/g, '')))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate skill match score
   */
  calculateSkillScore(caregiver, requiredSkills = []) {
    if (requiredSkills.length === 0) {
      return 10; // Default if no specific skills required
    }

    const caregiverCerts = caregiver.certifications || [];
    const caregiverBio = (caregiver.bio || '').toLowerCase();

    let matchedSkills = 0;
    requiredSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      
      if (caregiverCerts.some(c => c.toLowerCase().includes(skillLower))) {
        matchedSkills++;
      } else if (caregiverBio.includes(skillLower)) {
        matchedSkills++;
      }
    });

    // Score: 0-15 points
    return Math.min(15 * (matchedSkills / requiredSkills.length), 15);
  }

  /**
   * Calculate verification score
   */
  calculateVerificationScore(caregiver, credentialStats) {
    let score = 0;

    // Verified badge (5 points)
    if (caregiver.verified) {
      score += 5;
    }

    // Approved status (10 points)
    if (caregiver.approved) {
      score += 10;
    }

    // Credentials verified (bonus based on percentage)
    if (credentialStats && credentialStats.total > 0) {
      const verifiedPercent = credentialStats.verified / credentialStats.total;
      score += Math.min(verifiedPercent * 5, 5);
    }

    return Math.min(score, 15);
  }

  /**
   * Calculate rating and review score
   */
  calculateRatingScore(caregiver) {
    const rating = caregiver.rating || 0;
    const reviews = caregiver.totalReviews || 0;

    let score = 0;

    // Rating score (0-8 points)
    if (rating >= 4.5) {
      score += 8;
    } else if (rating >= 4.0) {
      score += 6;
    } else if (rating >= 3.5) {
      score += 4;
    } else if (rating >= 3.0) {
      score += 2;
    }

    // Review count bonus (0-2 points)
    if (reviews >= 20) {
      score += 2;
    } else if (reviews >= 10) {
      score += 1;
    }

    return Math.min(score, 10);
  }

  /**
   * Calculate availability score
   */
  calculateAvailabilityScore(caregiver, requiredDates = []) {
    // Check if caregiver is active
    if (!caregiver.isActive) {
      return 0;
    }

    let score = 5; // Base score for being active

    // If specific dates required, check availability
    if (requiredDates && requiredDates.length > 0) {
      // In production, check against caregiver's availability calendar
      score += 5; // Placeholder for date availability check
    } else {
      score += 5; // Full points if flexible
    }

    return Math.min(score, 10);
  }

  /**
   * Calculate price range score
   */
  calculatePriceScore(caregiver, familyBudget) {
    const caregiverRate = caregiver.dailyRate || 0;

    // If no budget specified, neutral score
    if (!familyBudget) {
      return 5;
    }

    // Perfect match
    if (Math.abs(caregiverRate - familyBudget) <= 5) {
      return 10;
    }
    // Close match
    if (Math.abs(caregiverRate - familyBudget) <= 15) {
      return 7;
    }
    // Acceptable
    if (caregiverRate <= familyBudget * 1.3) {
      return 5;
    }
    // Over budget
    return 2;
  }

  /**
   * Calculate recency bonus (recently rated/booked)
   */
  calculateRecencyBonus(caregiver) {
    const lastBookingDate = caregiver.lastBookingDate || caregiver.updatedAt;
    const daysSinceLastActivity = Math.floor((Date.now() - lastBookingDate) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActivity <= 7) {
      return 5; // Very recent
    } else if (daysSinceLastActivity <= 30) {
      return 3; // Recent
    } else if (daysSinceLastActivity <= 90) {
      return 1; // Somewhat recent
    }
    return 0; // Not recent
  }

  /**
   * Main matching function - KNN-based caregiver matching
   */
  async matchCaregivers(familyNeeds) {
    try {
      // 1. Get all approved, verified caregivers
      let caregivers = await User.find({
        userType: 'caregiver',
        approved: true,
        verified: true,
        isActive: true,
      }).lean();

      if (caregivers.length === 0) {
        return {
          matches: [],
          message: 'No verified caregivers available',
          totalAvailable: 0,
        };
      }

      // 2. Convert family needs to feature vector
      const familyVector = this.familyNeedsToFeatureVector(familyNeeds);

      // 3. Convert all caregivers to feature vectors
      const caregiverVectors = caregivers.map(caregiver =>
        this.caregiverToFeatureVector(caregiver, familyNeeds)
      );

      // 4. Find k nearest neighbors to family requirements
      const kNeighbors = this.findKNearestNeighbors(caregiverVectors, familyVector, this.k);

      // 5. Calculate match scores for all caregivers using KNN
      const matches = caregiverVectors.map(caregiverVector => {
        const knnResult = this.calculateKNNMatchScore(caregiverVector, familyVector, caregiverVectors);
        const caregiver = caregiverVector.caregiver;

        // Get credential stats for additional info
        const credentialStats = {
          total: caregiver.certifications?.length || 0,
          verified: caregiver.certifications?.length || 0,
        };

        return {
          caregiverId: caregiver._id,
          name: caregiver.name,
          email: caregiver.email,
          phone: caregiver.phone,
          city: caregiver.city,
          state: caregiver.state,
          bio: caregiver.bio,
          serviceType: caregiver.serviceType,
          dailyRate: caregiver.dailyRate,
          rating: caregiver.rating,
          totalReviews: caregiver.totalReviews,
          verified: caregiver.verified,
          approved: caregiver.approved,
          certifications: caregiver.certifications,
          matchScore: knnResult.score,
          matchPercentage: knnResult.score,
          knnDistance: knnResult.distance,
          knnRank: knnResult.rank,
          scoreBreakdown: {
            location: this.calculateLocationScore(caregiver.city, caregiver.state, familyNeeds.city, familyNeeds.state),
            experience: this.calculateExperienceScore(caregiver, familyNeeds.serviceType),
            skills: this.calculateSkillScore(caregiver, familyNeeds.requiredSkills),
            verification: this.calculateVerificationScore(caregiver, credentialStats),
            rating: this.calculateRatingScore(caregiver),
            availability: this.calculateAvailabilityScore(caregiver, familyNeeds.preferredDates),
            price: this.calculatePriceScore(caregiver, familyNeeds.budgetDaily),
            recency: this.calculateRecencyBonus(caregiver),
          },
        };
      });

      // 6. Sort by KNN match score descending (higher score = better match)
      matches.sort((a, b) => b.matchScore - a.matchScore);

      // 7. Return results with metadata
      return {
        matches: matches.slice(0, 50), // Top 50 matches
        totalAvailable: caregivers.length,
        message: `Found ${matches.length} matching caregivers using KNN (k=${this.k})`,
        familyNeeds: familyNeeds,
        algorithm: 'KNN',
        k: this.k,
      };
    } catch (err) {
      console.error('KNN Matching engine error:', err);
      throw new Error('Failed to match caregivers using KNN');
    }
  }

  /**
   * Configure KNN parameters
   */
  setK(value) {
    this.k = Math.max(1, Math.min(value, 20)); // k between 1-20
  }

  /**
   * Get single caregiver match score using KNN
   */
  async getMatchScore(caregiverId, familyNeeds) {
    try {
      const caregiver = await User.findById(caregiverId).lean();
      if (!caregiver) {
        throw new Error('Caregiver not found');
      }

      // Get all caregivers for KNN context
      const allCaregivers = await User.find({
        userType: 'caregiver',
        approved: true,
        verified: true,
        isActive: true,
      }).lean();

      const familyVector = this.familyNeedsToFeatureVector(familyNeeds);
      const caregiverVectors = allCaregivers.map(c => this.caregiverToFeatureVector(c, familyNeeds));
      const caregiverVector = caregiverVectors.find(cv => cv.id.toString() === caregiverId);

      if (!caregiverVector) {
        return { error: 'Caregiver not found in active pool' };
      }

      const knnResult = this.calculateKNNMatchScore(caregiverVector, familyVector, caregiverVectors);

      // Get credential stats
      const credentialStats = {
        total: caregiver.certifications?.length || 0,
        verified: caregiver.certifications?.length || 0,
      };

      return {
        caregiverId: caregiver._id,
        name: caregiver.name,
        email: caregiver.email,
        phone: caregiver.phone,
        city: caregiver.city,
        state: caregiver.state,
        bio: caregiver.bio,
        serviceType: caregiver.serviceType,
        dailyRate: caregiver.dailyRate,
        rating: caregiver.rating,
        totalReviews: caregiver.totalReviews,
        verified: caregiver.verified,
        approved: caregiver.approved,
        certifications: caregiver.certifications,
        matchScore: knnResult.score,
        matchPercentage: knnResult.score,
        knnDistance: knnResult.distance,
        knnRank: knnResult.rank,
        scoreBreakdown: {
          location: this.calculateLocationScore(caregiver.city, caregiver.state, familyNeeds.city, familyNeeds.state),
          experience: this.calculateExperienceScore(caregiver, familyNeeds.serviceType),
          skills: this.calculateSkillScore(caregiver, familyNeeds.requiredSkills),
          verification: this.calculateVerificationScore(caregiver, credentialStats),
          rating: this.calculateRatingScore(caregiver),
          availability: this.calculateAvailabilityScore(caregiver, familyNeeds.preferredDates),
          price: this.calculatePriceScore(caregiver, familyNeeds.budgetDaily),
          recency: this.calculateRecencyBonus(caregiver),
        },
        algorithm: 'KNN',
        k: this.k,
      };
    } catch (err) {
      console.error('Get KNN match score error:', err);
      throw err;
    }
  }
}

// Export singleton instance
export default new MatchingEngine();

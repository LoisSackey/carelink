import matchingEngine from '../utils/matchingEngine.js';
import User from '../models/User.js';

/**
 * Get matched caregivers for a family
 * POST /api/matching/match
 */
export const getMatchedCaregivers = async (req, res) => {
  try {
    const {
      city,
      state,
      serviceType,
      requiredSkills = [],
      preferredDates = [],
      budgetDaily = null,
      ageGroup,
      specialNeeds = [],
    } = req.body;

    // Validate required fields
    if (!city || !state) {
      return res.status(400).json({
        message: 'City and state are required',
      });
    }

    // Build family needs object
    const familyNeeds = {
      city,
      state,
      serviceType: serviceType || 'general',
      requiredSkills,
      preferredDates,
      budgetDaily,
      ageGroup,
      specialNeeds,
    };

    // Run matching algorithm
    const results = await matchingEngine.matchCaregivers(familyNeeds);

    res.status(200).json({
      message: 'Matching complete',
      ...results,
    });
  } catch (err) {
    console.error('Matching error:', err);
    res.status(500).json({
      message: err.message || 'Failed to match caregivers',
    });
  }
};

/**
 * Get match score for specific caregiver
 * POST /api/matching/score/:caregiverId
 */
export const getMatchScore = async (req, res) => {
  try {
    const { caregiverId } = req.params;
    const {
      city,
      state,
      serviceType,
      requiredSkills = [],
      budgetDaily = null,
    } = req.body;

    if (!city || !state) {
      return res.status(400).json({
        message: 'City and state are required',
      });
    }

    const familyNeeds = {
      city,
      state,
      serviceType: serviceType || 'general',
      requiredSkills,
      budgetDaily,
    };

    const matchScore = await matchingEngine.getMatchScore(caregiverId, familyNeeds);

    res.status(200).json({
      message: 'Match score calculated',
      match: matchScore,
    });
  } catch (err) {
    console.error('Match score error:', err);
    res.status(500).json({
      message: err.message || 'Failed to calculate match score',
    });
  }
};

/**
 * Get available caregivers (basic list without matching)
 * GET /api/matching/caregivers
 */
export const getAvailableCaregivers = async (req, res) => {
  try {
    const {
      city,
      state,
      serviceType,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter
    const filter = {
      userType: 'caregiver',
      approved: true,
      verified: true,
      isActive: true,
    };

    if (city) {
      filter.city = new RegExp(city, 'i');
    }
    if (state) {
      filter.state = new RegExp(state, 'i');
    }
    if (serviceType) {
      filter.serviceType = serviceType;
    }

    const skip = (page - 1) * limit;

    const caregivers = await User.find(filter)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ rating: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      message: 'Caregivers retrieved',
      count: caregivers.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      caregivers,
    });
  } catch (err) {
    console.error('Get caregivers error:', err);
    res.status(500).json({
      message: 'Failed to retrieve caregivers',
    });
  }
};

/**
 * Get matching statistics
 * GET /api/matching/stats
 */
export const getMatchingStats = async (req, res) => {
  try {
    const stats = {
      totalCaregivers: await User.countDocuments({
        userType: 'caregiver',
      }),
      verifiedCaregivers: await User.countDocuments({
        userType: 'caregiver',
        verified: true,
      }),
      approvedCaregivers: await User.countDocuments({
        userType: 'caregiver',
        approved: true,
      }),
      serviceCounts: {},
    };

    // Count by service type
    const serviceAggregation = await User.aggregate([
      {
        $match: {
          userType: 'caregiver',
          serviceType: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
        },
      },
    ]);

    serviceAggregation.forEach(item => {
      stats.serviceCounts[item._id] = item.count;
    });

    res.status(200).json({
      message: 'Matching statistics',
      stats,
    });
  } catch (err) {
    console.error('Matching stats error:', err);
    res.status(500).json({
      message: 'Failed to get statistics',
    });
  }
};

/**
 * Test matching algorithm with predefined families
 * GET /api/matching/test
 */
export const testMatching = async (req, res) => {
  try {
    // Test case 1: Family in Accra looking for eldercare
    const testFamily1 = {
      city: 'Accra',
      state: 'Greater Accra',
      serviceType: 'eldercare',
      requiredSkills: ['CPR Certified', 'Senior Care'],
      budgetDaily: 250,
    };

    const result1 = await matchingEngine.matchCaregivers(testFamily1);

    // Test case 2: Family in Kumasi looking for childcare
    const testFamily2 = {
      city: 'Kumasi',
      state: 'Ashanti',
      serviceType: 'childcare',
      requiredSkills: [],
      budgetDaily: 180,
    };

    const result2 = await matchingEngine.matchCaregivers(testFamily2);

    res.status(200).json({
      message: 'Test matching results',
      test1: {
        familyNeeds: testFamily1,
        matches: result1.matches.slice(0, 5),
        totalMatches: result1.matches.length,
      },
      test2: {
        familyNeeds: testFamily2,
        matches: result2.matches.slice(0, 5),
        totalMatches: result2.matches.length,
      },
    });
  } catch (err) {
    console.error('Test matching error:', err);
    res.status(500).json({
      message: 'Test matching failed',
      error: err.message,
    });
  }
};

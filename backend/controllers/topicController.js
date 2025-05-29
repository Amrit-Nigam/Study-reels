// Topic controller to handle operations related to topics
import Topic from '../models/Topic.js';

// Get all topics, sorted by date (newest first)
export const getTopics = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100; // Default to 100 items
    const topics = await Topic.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return res.status(200).json({
      success: true,
      count: topics.length,
      data: topics
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error fetching topics'
    });
  }
};

// Get topic statistics (count, unique count)
export const getTopicStats = async (req, res) => {
  try {
    const totalCount = await Topic.countDocuments();
    const uniqueCount = await Topic.distinct('text').then(arr => arr.length);
    
    return res.status(200).json({
      success: true,
      data: {
        totalCount,
        uniqueCount
      }
    });
  } catch (error) {
    console.error('Error fetching topic stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error fetching topic statistics'
    });
  }
};

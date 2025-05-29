// Topic model - stores information about topics used for script generation
import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  sessionId: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create an index on the text field for faster queries
topicSchema.index({ text: 1 });

const Topic = mongoose.model('Topic', topicSchema);

export default Topic;

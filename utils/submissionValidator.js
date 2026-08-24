/**
 * Anti-Garbage Submission Validator
 * Validates quest task submissions against defined rules
 */

const UserQuestProgress = require('../models/UserQuestProgress');

/**
 * Validate a submission against task validation rules
 * @param {Object} task - The task being submitted
 * @param {Object} submission - The submission data { url, text, screenshot }
 * @param {String} userId - The user ID submitting
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
async function validateSubmission(task, submission, userId) {
  const errors = [];
  const warnings = [];

  if (!task.validation) {
    // No validation rules - allow submission
    return { isValid: true, errors: [], warnings: [] };
  }

  const { url, text, screenshot } = submission;
  const validation = task.validation;

  // 1. Check if link is required
  if (validation.requiresLink && !url) {
    errors.push('Link/URL is required for this task');
  }

  // 2. Check if text is required
  if (validation.requiresText && !text) {
    errors.push('Text description is required for this task');
  }

  // 3. Check minimum text length
  if (validation.minTextLength && text) {
    const textLength = text.trim().length;
    if (textLength < validation.minTextLength) {
      errors.push(`Text must be at least ${validation.minTextLength} characters (current: ${textLength})`);
    }
  }

  // 4. Check required keywords
  if (validation.requiredKeywords && validation.requiredKeywords.length > 0 && text) {
    const lowerText = text.toLowerCase();
    const missingKeywords = [];

    for (const keyword of validation.requiredKeywords) {
      if (!lowerText.includes(keyword.toLowerCase())) {
        missingKeywords.push(keyword);
      }
    }

    if (missingKeywords.length > 0) {
      errors.push(`Your submission must include: ${missingKeywords.join(', ')}`);
    }
  }

  // 5. Link validation
  if (url && validation.linkValidation) {
    const linkVal = validation.linkValidation;

    // Check if URL contains required strings (e.g., twitter.com or x.com)
    if (linkVal.mustContain && linkVal.mustContain.length > 0) {
      const hasRequired = linkVal.mustContain.some(str => url.toLowerCase().includes(str.toLowerCase()));
      if (!hasRequired) {
        errors.push(`Link must be from: ${linkVal.mustContain.join(' or ')}`);
      }
    }

    // Check if it's a Twitter status/tweet URL (not profile)
    if (linkVal.mustBeStatus) {
      const isTwitter = url.includes('twitter.com') || url.includes('x.com');
      const isStatus = url.includes('/status/') || url.includes('/statuses/');

      if (isTwitter && !isStatus) {
        errors.push('Must be a tweet/status URL, not a profile link. (e.g., twitter.com/username/status/123...)');
      }
    }

    // Check for duplicate submissions
    if (!linkVal.allowDuplicates && task._id) {
      try {
        const duplicate = await UserQuestProgress.findOne({
          'taskProgress.submissionUrl': url,
          'taskProgress.taskId': task._id,
          userId: { $ne: userId } // Not the same user
        });

        if (duplicate) {
          errors.push('This link has already been submitted by another user. Please submit original content.');
        }
      } catch (dbError) {
        console.warn('Duplicate check failed:', dbError.message);
        // Continue without blocking submission
      }
    }

    // Check minimum engagement (for Twitter/social posts)
    if (linkVal.minLikes && linkVal.minLikes > 0) {
      warnings.push(`Note: Your post must have at least ${linkVal.minLikes} likes for approval. Admin will verify this.`);
    }
  }

  // 6. Minimum engagement validation (stored in submission data)
  if (validation.minEngagement && validation.minEngagement > 0) {
    warnings.push(`Note: Your post must have at least ${validation.minEngagement} likes/upvotes for approval. Admin will verify this.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Check if a Twitter URL is valid and extract tweet ID
 */
function parseTwitterUrl(url) {
  if (!url) return null;

  const patterns = [
    /twitter\.com\/\w+\/status\/(\d+)/,
    /x\.com\/\w+\/status\/(\d+)/,
    /twitter\.com\/\w+\/statuses\/(\d+)/,
    /x\.com\/\w+\/statuses\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        isValid: true,
        tweetId: match[1],
        platform: url.includes('twitter.com') ? 'twitter' : 'x'
      };
    }
  }

  return {
    isValid: false,
    tweetId: null,
    platform: null
  };
}

/**
 * Get user-friendly validation requirements for display
 */
function getValidationRequirements(task) {
  if (!task.validation) return [];

  const requirements = [];
  const val = task.validation;

  if (val.requiresLink) {
    requirements.push('✓ Must submit a valid link');
  }

  if (val.minTextLength && val.minTextLength > 0) {
    requirements.push(`✓ Minimum ${val.minTextLength} characters`);
  }

  if (val.requiredKeywords && val.requiredKeywords.length > 0) {
    requirements.push(`✓ Must include: ${val.requiredKeywords.join(', ')}`);
  }

  if (val.linkValidation) {
    const linkVal = val.linkValidation;

    if (linkVal.mustContain && linkVal.mustContain.length > 0) {
      requirements.push(`✓ Link must be from: ${linkVal.mustContain.join(' or ')}`);
    }

    if (linkVal.mustBeStatus) {
      requirements.push('✓ Must be a tweet/status URL (not profile)');
    }

    if (!linkVal.allowDuplicates) {
      requirements.push('✓ Link must not be already submitted by another user');
    }

    if (linkVal.minLikes && linkVal.minLikes > 0) {
      requirements.push(`✓ Post must have at least ${linkVal.minLikes} likes`);
    }
  }

  if (val.minEngagement && val.minEngagement > 0) {
    requirements.push(`✓ Minimum ${val.minEngagement} likes/upvotes required`);
  }

  return requirements;
}

module.exports = {
  validateSubmission,
  parseTwitterUrl,
  getValidationRequirements
};

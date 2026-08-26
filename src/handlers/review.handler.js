const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class ReviewHandler {
  static async get_all() {
    try {
      const review = await db(table_names.review).select('*');
      return {
        data: review
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      console.log('request: ', request.params, request.user)
      const review = await db(table_names.review)
        .where(request.params);
      return {
        data: review
      }
    } catch (error) {
      console.error('review.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      const payload = request.body
      payload.user_id = request.user.id
      const newReview = await db(table_names.review)
        .insert(request.body).returning('*');
      return {
        data: newReview
      }
    } catch (error) {
      console.error('review.create: ', error)
      return { error }
    }
  }

  static async update(request) {
    try {
      const updatedReview = await db(table_names.review)
        .where({ id: request.user.id })
        .update(request.body)
        .returning('*');
      return {
        data: updatedReview
      }
    } catch (error) {
      console.error('review.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      const deletedReview = await db(table_names.review)
        .where({ id: request.user.id }).del();
      return {
        data: deletedReview
      }
    } catch (error) {
      console.error('review.update: ', error)
      return { error }
    }
  }
}

module.exports = ReviewHandler;

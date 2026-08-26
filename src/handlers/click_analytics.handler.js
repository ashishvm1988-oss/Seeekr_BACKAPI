const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class ClickAnalyticsHandler {

  static async create(request) {
    try {
      const newClick = {
        user_id: request.user.id,
        clicked_id: request.body.clicked_id,
        clicked_at: request.body.clicked_at,
        click_type: request.body.click_type
      }
      const saved = await db(table_names.click_analytics)
        .insert(newClick).returning('*');
      return {
        data: saved
      }
    } catch (error) {
      console.error('click_analytics.create: ', error)
      return { error }
    }
  }

  static async get_all() {
    try {
      const click_analytics = await db(table_names.click_analytics).select('*');
      return {
        data: click_analytics
      };
    } catch (error) {
      console.error('click_analytics.getAll: ', error)
      return { error }
    }
  }

  static async get(request) { // 
    try {
      const { id } = request.query;

      // Check if the click analytics exists
      const click_analytics = await db(table_names.click_analytics)
        .where({ id })
        .first();

      if (!click_analytics) {
        return {
          error: 'Click not found by the provided Id',
          status: 404
        };
      }
      
      return {
        data: click_analytics
      }
    } catch (error) {
      console.error('click_analytics.get: ', error)
      return { error }
    }
  }

  static async update(request) {
    try {

      const { id } = request.query;
      const updateData = request.body;

      // Check if the click analytics exists
      const existingAnalytics = await db(table_names.click_analytics)
        .where({ id })
        .first();

      if (!existingAnalytics) {
        return {
          error: 'Click not found by the provided Id',
          status: 404
        };
      }

      // Proceed with the update
      const updatedClick = await db(table_names.click_analytics)
        .where({ id })
        .update(updateData, ['id']);

      return {
        data: updatedClick,
        message: 'Update successful'
      };
    } catch (error) {
      console.error('click_analytics.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      const { id } = request.query;

      // Check if the click analytics exists
      const existingAnalytics = await db(table_names.click_analytics)
        .where({ id })
        .first();

      if (!existingAnalytics) {
        return {
          error: 'Click not found by the provided Id',
          status: 404
        };
      }

      // Proceed with the deletion
      const deletedRows = await db(table_names.click_analytics)
        .where({ id })
        .del();

      return {
        data: deletedRows,
        message: 'Delete successful'
      };
    } catch (error) {
      console.error('click_analytics.delete: ', error)
      return { error }
    }
  }
}

module.exports = ClickAnalyticsHandler;

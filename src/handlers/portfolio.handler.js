const { table_names, user_roles } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { writeIconImage } = require('#src/helpers/image');

class PortfolioHandler {
  // Public: anyone viewing a provider's profile needs to see their portfolio,
  // logged in or not — this handler is NOT behind auth_hook (see router).
  static async list(request) {
    try {
      const userId = request.query?.user_id;
      if (!userId) {
        return { message: 'user_id is required' };
      }
      const images = await db(table_names.portfolio_images)
        .where({ user_id: userId })
        .orderBy('sort_order', 'asc')
        .orderBy('created', 'desc');
      return { data: images };
    } catch (error) {
      console.error('portfolio.list: ', error);
      return { error };
    }
  }

  static async upload(request) {
    try {
      if (request.userType !== 'user' || request.user.role !== user_roles.provider) {
        return { message: 'Only service provider accounts can upload portfolio images' };
      }

      const file = await request.file();
      if (!file) {
        return { message: 'No image file provided' };
      }

      let safeName;
      try {
        safeName = await writeIconImage('portfolio', file.filename, file);
      } catch (validationError) {
        // Unsupported extension etc. — a 400 with a clear reason, not a 500.
        return { message: validationError.message };
      }
      const image_url = `/public/portfolio/icon/${safeName}`;

      const [id] = await db(table_names.portfolio_images).insert({
        user_id: request.user.id,
        image_url,
        caption: file.fields?.caption?.value || null,
        sort_order: 0,
        created: new Date()
      });

      const newImage = await db(table_names.portfolio_images).where({ id }).first();
      return { data: newImage };
    } catch (error) {
      console.error('portfolio.upload: ', error);
      return { error };
    }
  }

  static async delete(request) {
    try {
      const id = request.query?.id;
      if (!id) {
        return { message: 'id is required' };
      }
      // Only the owning provider may delete their own portfolio image.
      const deleted = await db(table_names.portfolio_images)
        .where({ id, user_id: request.user.id })
        .del();
      return { data: { deleted: deleted > 0 } };
    } catch (error) {
      console.error('portfolio.delete: ', error);
      return { error };
    }
  }
}

module.exports = PortfolioHandler;

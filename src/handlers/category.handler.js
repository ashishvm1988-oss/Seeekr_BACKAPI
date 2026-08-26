const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { writeIconImage } = require('#src/helpers/image');

class CategoryHandler {
  static async get_all() {
    try {
      const category = await db(table_names.categories).select('*').orderBy('name');
      return {
        data: category
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      let category;
      if(request.query.id){
        category = await db(table_names.categories).select('*')
          .where({ id: request.query.id }).first();
      } else {
        category = await db(table_names.categories).select('*').orderBy('name');
      }
      return {
        data: category
      }
    } catch (error) {
      console.error('category.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      const { name, color } = request.query;

      if(!name){
        return { message: 'name is required' };
      }

      const [id] = await db(table_names.categories)
        .insert({ name, color, created: new Date(), created_by: request.user?.id });

      // Icon is optional — only attempt to read/store a file if this was a
      // multipart request that actually included one.
      if (request.isMultipart?.()) {
        const image = await request.file();
        if (image) {
          const safeName = await writeIconImage('category', image.filename, image);
          await db(table_names.categories).where({ id }).update({
            icon_url: `/public/category/icon/${safeName}`
          });
        }
      }

      const newCategory = await db(table_names.categories).where({ id }).first();
      return {
        data: newCategory
      }
    } catch (error) {
      console.error('category.create: ', error)
      return { error }
    }
  }

  static async update(request) {
    try {
      if(!request.query.id){
        return { message: 'id is required' };
      }
      await db(table_names.categories).where({ id: request.query.id }).update(request.body);
      const updatedCategory = await db(table_names.categories).where({ id: request.query.id }).first();
      return {
        data: updatedCategory
      }
    } catch (error) {
      console.error('category.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      const deletedCategory = await db(table_names.categories)
        .where({ id: request.query.id }).del();
      return {
        data: { deleted: deletedCategory > 0 }
      }
    } catch (error) {
      console.error('category.delete: ', error)
      return { error }
    }
  }
}

module.exports = CategoryHandler;

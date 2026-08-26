const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class SubCategoryHandler {
  static async get_all(request) {
    try {
      let query = db(table_names.sub_category).select('*').orderBy('name');
      // Supports the category -> subcategory drill-down screen:
      // GET /sub-category/all?category_id=3
      if (request?.query?.category_id) {
        query = query.where({ category_id: request.query.category_id });
      }
      const subcategory = await query;
      return {
        data: subcategory
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      let subcategory;
      if(request?.query?.id){
        subcategory = await db(table_names.sub_category)
          .where({ id: request.query.id }).select('*').first();
      } else if (request?.query?.category_id) {
        subcategory = await db(table_names.sub_category)
          .where({ category_id: request.query.category_id }).select('*').orderBy('name');
      } else {
        subcategory = await db(table_names.sub_category).select('*').orderBy('name');
      }

      return {
        data: subcategory
      }
    } catch (error) {
      console.error('subcategory.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      const { name, category_id } = request.body || {};
      if(!name || !category_id){
        return { message: 'name and category_id are required' };
      }
      const [id] = await db(table_names.sub_category)
        .insert({ name, category_id, created_by: request.user?.id });
      const newSubCategory = await db(table_names.sub_category).where({ id }).first();
      return {
        data: newSubCategory
      }
    } catch (error) {
      console.error('subcategory.create: ', error)
      return { error }
    }
  }

  static async update(request) {
    try {
      if(!request.query.id){
        return { message: 'id is required' };
      }
      await db(table_names.sub_category).where({ id: request.query.id }).update(request.body);
      const updatedSubCategory = await db(table_names.sub_category).where({ id: request.query.id }).first();
      return {
        data: updatedSubCategory
      }
    } catch (error) {
      console.error('subcategory.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      const deletedSubCategory = await db(table_names.sub_category)
        .where({ id: request.query.id }).del();
      return {
        data: { deleted: deletedSubCategory > 0 }
      }
    } catch (error) {
      console.error('subcategory.delete: ', error)
      return { error }
    }
  }
}

module.exports = SubCategoryHandler;

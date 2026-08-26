const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class EducationHandler {
  static async get_all() {
    try {
      const education = await db(table_names.education).select('*');
      return {
        data: education
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      const education = await db(table_names.education)
        .where({ id: request.params.id }).first();
      return {
        data: education
      }
    } catch (error) {
      console.error('awards.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      const newEducation = await db(table_names.education)
        .insert(request.body).returning('*');
      return {
        data: newEducation
      }
    } catch (error) {
      return { error }
    }
  }

  static async update(request) {
    try {
      const updatedEducation = await db(table_names.education)
        .where({ id: request.params.id })
        .update(request.body)
        .returning('*');
      return {
        data: updatedEducation
      }
    } catch (error) {
      return { error }
    }
  }

  static async delete(request) {
    try {
      const deletedEducation = await db(table_names.education)
        .where({ id: request.params.id }).del();
      return {
        data: deletedEducation
      }
    } catch (error) {
      return { error }
    }
  }
}

module.exports = EducationHandler;

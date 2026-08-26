const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class AdminUserHandler {
  static async get_all() {
    try {
      const users = await db(table_names.admin_users).select('*');
      console.log('AdminUserHandler.users: ', users)
      return {
        data: users
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      let user;
      if(request.query.user_id){
        user = await db(table_names.admin_users)
        .where({ id: request.query.id }).first(1);
      } else {
        user = await db(table_names.admin_users).select(['id', 'user_name', 'deleted', 'email', 'phone_number'])
      }
      return {
        data: user
      }
    } catch (error) {
      console.error('admin_users.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      const newUser = await db(table_names.admin_users)
        .insert(request.body).returning('*');
      return {
        data: newUser
      }
    } catch (error) {
      return { error }
    }
  }

  // TODO: create login

  static async update(request) {
    try {
      const updatedUser = await db(table_names.admin_users)
        .where({ id: request.query.id })
        .update(request.body)
        .returning('*');
      return {
        data: updatedUser
      }
    } catch (error) {
      return { error }
    }
  }

  static async delete(request) {
    try {
      const deletedUser = await db(table_names.admin_users)
        .where({ id: request.query.id }).del();
      return {
        data: deletedUser
      }
    } catch (error) {
      return { error }
    }
  }
}

module.exports = AdminUserHandler;

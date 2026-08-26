const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { genericErrorMessage } = require('#src/helpers/handle_error')

class AwardsHandler {
  static async get_all() {
    try {
      const awards = await db(table_names.awards).select('*');
      return {
        data: awards
      };
    } catch (error) {
      return { error }
    }
  }

  static async get(request) {
    try {
      let awards;
      if(request.query.user_id && request.userType === 'admin'){
        if(request.query.user_id){
          awards = await db(table_names.awards)
            .where({ user_id: request.query.user_id });
        } else {
          return {
            error: 'User id is required for the award'
          }
        }
      } else {
        awards = await db(table_names.awards)
          .where({ user_id: request.user.id })
      }
      
      return {
        data: awards
      }
    } catch (error) {
      console.error('awards.get: ', error)
      return { error }
    }
  }

  static async create(request) {
    try {
      console.log('request.body: ', request.body)
      let user_id;
      if(request.userType === 'admin'){
         if(request.query.user_id){
          user_id = request.query.user_id;
         } else {
          return {
            error: 'User id is required'
          }
         }
      } else {
        user_id = request.user.id
      }

      const newAward = await db(table_names.awards)
        .insert({
          ...request.body,
          user_id
        }).returning('*');
      return {
        data: newAward
      }
    } catch (error) {
      // ER_NO_REFERENCED_ROW_2
      const message = genericErrorMessage(error)
      return { error, message }
    }
  }

  static async update(request) {
    try {
      let user_id;
      if(request.query.id){
        if(request.userType === 'admin'){
          if(request.query.user_id){
           user_id = request.query.user_id;
          } else {
           return {
             error: 'User-Id/Awards Id is required'
           }
          }
       } else {
         user_id = request.user.id
       }
      } else {
        return {
          error: 'Awards Id is required.'
        }
      }

      const updatedAward = await db(table_names.awards)
        .where({ id: request.query.id, user_id })
        .update(request.body)
        .returning('*');
      return {
        data: updatedAward
      }
    } catch (error) {
      console.error('awards.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      let user_id;
      if(request.query.id){
        if(request.userType === 'admin'){
          if(request.query.user_id){
           user_id = request.query.user_id;
          } else {
           return {
             error: 'User-Id/Awards Id is required'
           }
          }
       } else {
         user_id = request.user.id
       }
      } else {
        return {
          error: 'Awards Id is required.'
        }
      }

      const deletedAward = await db(table_names.awards)
        .where({ id: request.query.id, user_id }).del();
      return {
        data: deletedAward
      }
    } catch (error) {
      console.error('awards.delete: ', error)
      return { error }
    }
  }
}

module.exports = AwardsHandler;

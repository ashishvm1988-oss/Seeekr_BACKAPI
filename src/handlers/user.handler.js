const bcrypt = require('bcrypt');
const { table_names, user_roles } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { startTrialSubscription } = require('#src/helpers/subscription');
const { syncProviderServices } = require('#src/helpers/provider_services');

const SALT_ROUNDS = 12;

// Fields that are safe to ever send back over the API. Notably excludes
// `password` (even hashed, it never needs to leave the server) and keeps
// this as an allowlist rather than a "delete the bad field" denylist so a
// future column addition doesn't silently start leaking again.
const PUBLIC_USER_COLUMNS = [
  'id', 'username', 'email', 'role', 'contact', 'about',
  'location', 'current_location', 'country_code', 'city',
  'google_id', 'insta_id', 'deleted'
];

class UserHandler {
  static async get_all() {
    try {
      const users = await db(table_names.users).select(PUBLIC_USER_COLUMNS);
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
      if(request.query?.id){
        user = await db(table_names.users)
          .select(PUBLIC_USER_COLUMNS)
          .where({ id: request.query.id }).first();
      } else {
        user = await db(table_names.users).select(PUBLIC_USER_COLUMNS)
      }
      return {
        data: user
      }
    } catch (error) {
      return { error }
    }
  }

  static async create(request) {
    try {
      const { username, email, password, role, contact, about, city, sub_category_ids } = request.body || {};

      if(!username || !email || !password){
        return { message: 'username, email and password are required' };
      }
      if(!role || ![user_roles.customer, user_roles.provider].includes(role)){
        return { message: `role must be one of: ${user_roles.customer}, ${user_roles.provider}` };
      }
      if(String(password).length < 8){
        return { message: 'password must be at least 8 characters' };
      }

      const existing = await db(table_names.users)
        .where({ email }).orWhere({ username }).first();
      if(existing){
        return { message: 'an account with that email or username already exists' };
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const [id] = await db(table_names.users).insert({
        username, email, role, contact, about, city,
        password: password_hash,
        deleted: false
      });

      if (role === user_roles.provider) {
        // Starts the 6-months-free clock the moment a provider signs up.
        // No payment gateway wired up yet — this just makes the status
        // queryable so billing can be switched on later without a schema
        // change or backfill.
        await startTrialSubscription(id);
        if (Array.isArray(sub_category_ids) && sub_category_ids.length) {
          await syncProviderServices(id, sub_category_ids);
        }
      }

      const newUser = await db(table_names.users)
        .select(PUBLIC_USER_COLUMNS)
        .where({ id }).first();

      return {
        data: newUser
      }
    } catch (error) {
      console.error('user.create: ', error)
      return { error }
    }
  }

  static async update(request) {
    try {
      // Never allow role or password to be changed through the generic update
      // endpoint — role changes go through a dedicated flow, password changes
      // need their own re-hash + current-password check.
      const { password, role, sub_category_ids, ...safeBody } = request.body || {};

      let targetId;
      if(request.userType === 'admin'){
        if(!request.query.id){
          return { error: 'User Id is required' };
        }
        targetId = request.query.id;
      } else {
        targetId = request.user.id;
      }

      if (Object.keys(safeBody).length) {
        await db(table_names.users).where({ id: targetId }).update(safeBody);
      }

      if (Array.isArray(sub_category_ids)) {
        await syncProviderServices(targetId, sub_category_ids);
      }

      const updatedUser = await db(table_names.users)
        .select(PUBLIC_USER_COLUMNS)
        .where({ id: targetId }).first();

      return {
        data: updatedUser
      }
    } catch (error) {
      console.error('user.update: ', error)
      return { error }
    }
  }

  static async delete(request) {
    try {
      // Soft-delete: real user data (reviews, messages, provider listings)
      // reference this row, so a hard delete would either cascade-destroy
      // history other users still need to see, or fail on the FK.
      const updated = await db(table_names.users)
        .where({ id: request.query.id }).update({ deleted: true });
      return {
        data: { deleted: updated > 0 }
      }
    } catch (error) {
      return { error }
    }
  }
}

module.exports = UserHandler;

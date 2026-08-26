const { table_names, user_roles } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class ProviderSearchHandler {
  // Public browse/search endpoint behind the Home screen's category grid,
  // location picker, and search bar. All filters are optional and combine
  // with AND: category_id, sub_category_id, city, q (name/about text match).
  static async search(request) {
    try {
      const { category_id, sub_category_id, city, q, id, page = 1, limit = 20 } = request.query || {};

      let query = db(table_names.users)
        .where(`${table_names.users}.role`, user_roles.provider)
        .andWhere(`${table_names.users}.deleted`, false);

      // Lets the provider profile screen reuse this same query (rating +
      // services aggregation included) to fetch a single provider by id,
      // instead of needing a separate detail endpoint.
      if (id) {
        query = query.andWhere(`${table_names.users}.id`, id);
      }

      if (sub_category_id || category_id) {
        query = query
          .join(table_names.provider_subcategories, `${table_names.provider_subcategories}.user_id`, `${table_names.users}.id`)
          .join(table_names.sub_category, `${table_names.sub_category}.id`, `${table_names.provider_subcategories}.sub_category_id`);

        if (sub_category_id) {
          query = query.andWhere(`${table_names.provider_subcategories}.sub_category_id`, sub_category_id);
        }
        if (category_id) {
          query = query.andWhere(`${table_names.sub_category}.category_id`, category_id);
        }
      }

      if (city) {
        query = query.andWhere(`${table_names.users}.city`, 'like', `%${city}%`);
      }

      if (q) {
        query = query.andWhere(builder => {
          builder.where(`${table_names.users}.username`, 'like', `%${q}%`)
            .orWhere(`${table_names.users}.about`, 'like', `%${q}%`);
        });
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

      // Explicit allowlist of columns, applied together with .distinct() so
      // a provider matching more than one filtered subcategory (from the
      // join above) still shows up once — and, just as importantly, so the
      // SELECT can never widen to `users.*` and leak the password hash the
      // way an earlier version of this query did.
      const providers = await query
        .distinct()
        .select(
          `${table_names.users}.id`,
          `${table_names.users}.username`,
          `${table_names.users}.about`,
          `${table_names.users}.city`,
          `${table_names.users}.contact`
        )
        .orderBy(`${table_names.users}.id`, 'desc')
        .limit(pageSize)
        .offset((pageNum - 1) * pageSize);

      if (!providers.length) {
        return { data: { results: [], page: pageNum, limit: pageSize } };
      }

      const providerIds = providers.map(p => p.id);

      // Aggregate ratings and the services each provider offers in two more
      // queries rather than a giant multi-join — simpler to read and avoids
      // fan-out duplication across the result set.
      const ratings = await db(table_names.review)
        .select('user_id')
        .avg('rating as average_rating')
        .count('id as review_count')
        .whereIn('user_id', providerIds)
        .groupBy('user_id');
      const ratingByUser = Object.fromEntries(ratings.map(r => [r.user_id, r]));

      const services = await db(table_names.provider_subcategories)
        .join(table_names.sub_category, `${table_names.sub_category}.id`, `${table_names.provider_subcategories}.sub_category_id`)
        .whereIn(`${table_names.provider_subcategories}.user_id`, providerIds)
        .select(`${table_names.provider_subcategories}.user_id`, `${table_names.sub_category}.name`);
      const servicesByUser = {};
      for (const s of services) {
        (servicesByUser[s.user_id] ||= []).push(s.name);
      }

      const results = providers.map(p => ({
        ...p,
        average_rating: ratingByUser[p.id] ? Number(ratingByUser[p.id].average_rating).toFixed(1) : null,
        review_count: ratingByUser[p.id]?.review_count || 0,
        services: servicesByUser[p.id] || []
      }));

      return { data: { results, page: pageNum, limit: pageSize } };
    } catch (error) {
      console.error('provider_search.search: ', error);
      return { error };
    }
  }
}

module.exports = ProviderSearchHandler;

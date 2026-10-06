const { table_names, user_roles } = require('#src/globals/constants');
const db = require('#src/helpers/db');

// Slot times are stored/returned as 'HH:MM' (24-hour). MySQL TIME columns
// come back from mysql2 as 'HH:MM:SS' strings, never JS Date objects, so
// string comparison/sorting works fine as long as we're consistent about
// trimming to 'HH:MM'.
function toHHMM(time) {
  if (!time) return time;
  return String(time).slice(0, 5);
}

function toHHMMSS(time) {
  const hhmm = toHHMM(time);
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Calendar day-of-week for a plain 'YYYY-MM-DD' string, computed without
// going through the server's local timezone (Date.UTC keeps "Oct 10" as
// "Oct 10" regardless of where this process happens to be running).
function dayOfWeekFor(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// "Is this slot in the past" has to be judged against India time, since
// every provider and customer is in Chennai/Bangalore — not against
// whatever timezone the server process happens to be running in (Railway
// runs UTC, which is 5.5 hours behind IST, so comparing against the raw
// server clock would wrongly treat the first ~5 hours of each IST day as
// still "yesterday").
function nowInIST() {
  const shifted = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const dateStr = `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
  const hhmm = `${String(shifted.getUTCHours()).padStart(2, '0')}:${String(shifted.getUTCMinutes()).padStart(2, '0')}`;
  return { dateStr, hhmm };
}

function isValidDateString(dateStr) {
  return typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

class ScheduleHandler {
  // Public: a provider's weekly working-hours template.
  static async getAvailability(request) {
    try {
      const providerId = request.query?.provider_id;
      if (!providerId) {
        return { message: 'provider_id is required' };
      }
      const rows = await db(table_names.provider_availability)
        .where({ user_id: providerId })
        .orderBy('day_of_week', 'asc');
      return {
        data: rows.map(r => ({
          day_of_week: r.day_of_week,
          start_time: toHHMM(r.start_time),
          end_time: toHHMM(r.end_time),
          slot_minutes: r.slot_minutes,
        })),
      };
    } catch (error) {
      console.error('schedule.getAvailability: ', error);
      return { error };
    }
  }

  // Provider-only: replaces their whole weekly template in one go (the
  // editor always submits the full week, so full-replace is simplest and
  // avoids partial-update bugs).
  static async setAvailability(request) {
    try {
      if (request.userType !== 'user' || request.user.role !== user_roles.provider) {
        return { message: 'Only service provider accounts can set availability' };
      }

      const days = request.body?.days;
      if (!Array.isArray(days)) {
        return { message: 'days must be an array' };
      }

      const seen = new Set();
      const rows = [];
      for (const d of days) {
        const dow = Number(d.day_of_week);
        const start = d.start_time;
        const end = d.end_time;
        const slotMinutes = Number(d.slot_minutes) || 60;

        if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
          return { message: `Invalid day_of_week: ${d.day_of_week}` };
        }
        if (seen.has(dow)) {
          return { message: 'Each day can only appear once' };
        }
        seen.add(dow);

        if (!/^\d{2}:\d{2}$/.test(start || '') || !/^\d{2}:\d{2}$/.test(end || '')) {
          return { message: 'start_time and end_time must be HH:MM' };
        }
        if (start >= end) {
          return { message: `End time must be after start time (day ${dow})` };
        }
        if (![15, 30, 60, 90, 120].includes(slotMinutes)) {
          return { message: 'slot_minutes must be one of 15, 30, 60, 90, 120' };
        }

        rows.push({
          user_id: request.user.id,
          day_of_week: dow,
          start_time: toHHMMSS(start),
          end_time: toHHMMSS(end),
          slot_minutes: slotMinutes,
          created: new Date(),
          updated: new Date(),
        });
      }

      await db.transaction(async trx => {
        await trx(table_names.provider_availability).where({ user_id: request.user.id }).del();
        if (rows.length) {
          await trx(table_names.provider_availability).insert(rows);
        }
      });

      return await ScheduleHandler.getAvailability({ query: { provider_id: request.user.id } });
    } catch (error) {
      console.error('schedule.setAvailability: ', error);
      return { error };
    }
  }

  // Public: the bookable grid for one provider on one date. Doesn't try to
  // flag "this is your own pending request" here (this route is reachable
  // logged-out, and auth_hook doesn't decode a token on public routes) —
  // the frontend cross-references GET /schedule/bookings/mine for that.
  static async getSlots(request) {
    try {
      const providerId = request.query?.provider_id;
      const date = request.query?.date;
      if (!providerId || !date) {
        return { message: 'provider_id and date are required' };
      }
      if (!isValidDateString(date)) {
        return { message: 'date must be YYYY-MM-DD' };
      }

      const dow = dayOfWeekFor(date);
      const availability = await db(table_names.provider_availability)
        .where({ user_id: providerId, day_of_week: dow })
        .first();

      if (!availability) {
        return { data: { date, day_of_week: dow, available: false, slot_minutes: null, slots: [] } };
      }

      const existing = await db(table_names.schedule_bookings)
        .where({ provider_id: providerId, booking_date: date })
        .whereIn('status', ['pending', 'confirmed'])
        .select('start_time', 'status');
      const takenByStart = new Map(existing.map(b => [toHHMM(b.start_time), b.status]));

      const { dateStr: todayStr, hhmm: nowHHMM } = nowInIST();

      const slots = [];
      let cursor = toHHMM(availability.start_time);
      const end = toHHMM(availability.end_time);
      const slotMinutes = availability.slot_minutes;
      while (cursor < end) {
        const slotEnd = addMinutes(cursor, slotMinutes);
        if (slotEnd > end) break;

        let status = 'available';
        if (date < todayStr || (date === todayStr && cursor <= nowHHMM)) {
          status = 'past';
        } else if (takenByStart.has(cursor)) {
          status = 'unavailable';
        }

        slots.push({ start_time: cursor, end_time: slotEnd, status });
        cursor = slotEnd;
      }

      return { data: { date, day_of_week: dow, available: true, slot_minutes: slotMinutes, slots } };
    } catch (error) {
      console.error('schedule.getSlots: ', error);
      return { error };
    }
  }

  // Any logged-in user: request a slot. Creates a 'pending' row — the
  // provider still has to accept it (see respond()) before it's a real
  // booking, same as Practo/restaurant-style booking sites.
  static async book(request) {
    try {
      if (request.userType !== 'user') {
        return { message: 'Only logged-in users can request a booking' };
      }
      const { provider_id, date, start_time } = request.body || {};
      if (!provider_id || !date || !start_time) {
        return { message: 'provider_id, date and start_time are required' };
      }
      if (Number(provider_id) === request.user.id) {
        return { message: "You can't book your own schedule" };
      }
      if (!isValidDateString(date)) {
        return { message: 'date must be YYYY-MM-DD' };
      }

      const provider = await db(table_names.users).where({ id: provider_id }).first();
      if (!provider || provider.deleted || provider.role !== user_roles.provider) {
        return { message: 'Provider not found' };
      }

      const dow = dayOfWeekFor(date);
      const availability = await db(table_names.provider_availability)
        .where({ user_id: provider_id, day_of_week: dow })
        .first();
      if (!availability) {
        return { message: 'This provider is not available on that day' };
      }

      const start = toHHMM(start_time);
      const windowStart = toHHMM(availability.start_time);
      const windowEnd = toHHMM(availability.end_time);
      const slotMinutes = availability.slot_minutes;
      const end = addMinutes(start, slotMinutes);

      const onGrid = (() => {
        let cursor = windowStart;
        while (cursor < windowEnd) {
          if (cursor === start) return true;
          cursor = addMinutes(cursor, slotMinutes);
        }
        return false;
      })();
      if (!onGrid || end > windowEnd) {
        return { message: "That's not a valid time slot for this provider" };
      }

      const { dateStr: todayStr, hhmm: nowHHMM } = nowInIST();
      if (date < todayStr || (date === todayStr && start <= nowHHMM)) {
        return { message: "That slot is in the past" };
      }

      const result = await db.transaction(async trx => {
        const clash = await trx(table_names.schedule_bookings)
          .where({ provider_id, booking_date: date, start_time: toHHMMSS(start) })
          .whereIn('status', ['pending', 'confirmed'])
          .first();
        if (clash) {
          return { message: 'That slot was just taken — please pick another.' };
        }
        const [id] = await trx(table_names.schedule_bookings).insert({
          provider_id,
          customer_id: request.user.id,
          booking_date: date,
          start_time: toHHMMSS(start),
          end_time: toHHMMSS(end),
          status: 'pending',
          created: new Date(),
        });
        return { id };
      });
      if (result.message) return result;

      const created = await db(table_names.schedule_bookings).where({ id: result.id }).first();
      return { data: created };
    } catch (error) {
      console.error('schedule.book: ', error);
      return { error };
    }
  }

  // Provider-only: accept or decline a pending request.
  static async respond(request) {
    try {
      if (request.userType !== 'user' || request.user.role !== user_roles.provider) {
        return { message: 'Only service provider accounts can respond to bookings' };
      }
      const { id, action } = request.body || {};
      if (!id || !['confirm', 'decline'].includes(action)) {
        return { message: "action must be 'confirm' or 'decline'" };
      }

      const booking = await db(table_names.schedule_bookings).where({ id }).first();
      if (!booking || booking.provider_id !== request.user.id) {
        return { message: 'Booking not found' };
      }
      if (booking.status !== 'pending') {
        return { message: `This request is already ${booking.status}` };
      }

      await db(table_names.schedule_bookings)
        .where({ id })
        .update({
          status: action === 'confirm' ? 'confirmed' : 'declined',
          responded_at: new Date(),
        });

      const updated = await db(table_names.schedule_bookings).where({ id }).first();
      return { data: updated };
    } catch (error) {
      console.error('schedule.respond: ', error);
      return { error };
    }
  }

  // Either side of a booking can cancel it after the fact.
  static async cancel(request) {
    try {
      if (request.userType !== 'user') {
        return { message: 'Only logged-in users can cancel a booking' };
      }
      const id = request.body?.id;
      if (!id) {
        return { message: 'id is required' };
      }
      const booking = await db(table_names.schedule_bookings).where({ id }).first();
      if (!booking || (booking.provider_id !== request.user.id && booking.customer_id !== request.user.id)) {
        return { message: 'Booking not found' };
      }
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return { message: `This request is already ${booking.status}` };
      }

      await db(table_names.schedule_bookings)
        .where({ id })
        .update({ status: 'cancelled', responded_at: new Date() });

      const updated = await db(table_names.schedule_bookings).where({ id }).first();
      return { data: updated };
    } catch (error) {
      console.error('schedule.cancel: ', error);
      return { error };
    }
  }

  // The logged-in user's own bookings, from both sides of the table — as
  // the customer who requested slots, and (for a provider account) as the
  // provider receiving requests. The frontend only shows whichever side is
  // relevant to the page it's on.
  static async mine(request) {
    try {
      const myId = request.user.id;

      const asCustomerRows = await db(table_names.schedule_bookings)
        .where({ customer_id: myId })
        .orderBy('booking_date', 'desc')
        .orderBy('start_time', 'desc');
      const asProviderRows = await db(table_names.schedule_bookings)
        .where({ provider_id: myId })
        .orderBy('booking_date', 'desc')
        .orderBy('start_time', 'desc');

      const otherIds = [...new Set([
        ...asCustomerRows.map(r => r.provider_id),
        ...asProviderRows.map(r => r.customer_id),
      ])];
      const users = otherIds.length
        ? await db(table_names.users).select('id', 'username', 'contact', 'avatar_url').whereIn('id', otherIds)
        : [];
      const userById = Object.fromEntries(users.map(u => [u.id, u]));

      const hydrate = (rows, otherKey) => rows.map(r => ({
        ...r,
        start_time: toHHMM(r.start_time),
        end_time: toHHMM(r.end_time),
        other_user: userById[r[otherKey]] || null,
      }));

      return {
        data: {
          as_customer: hydrate(asCustomerRows, 'provider_id'),
          as_provider: hydrate(asProviderRows, 'customer_id'),
        },
      };
    } catch (error) {
      console.error('schedule.mine: ', error);
      return { error };
    }
  }

  // Admin-only aggregate — the numbers to show investors. A booking can be
  // counted under more than one category when a provider lists more than
  // one sub-category, which is an acceptable approximation for this kind of
  // rough engagement snapshot.
  static async stats(_request) {
    try {
      const totalByStatus = await db(table_names.schedule_bookings)
        .select('status')
        .count({ count: '*' })
        .groupBy('status');

      const uniqueCustomers = await db(table_names.schedule_bookings).countDistinct({ count: 'customer_id' }).first();
      const uniqueProviders = await db(table_names.schedule_bookings).countDistinct({ count: 'provider_id' }).first();

      const byProvider = await db(table_names.schedule_bookings)
        .join(table_names.users, `${table_names.users}.id`, `${table_names.schedule_bookings}.provider_id`)
        .select(`${table_names.users}.id as provider_id`, `${table_names.users}.username as provider_username`)
        .count({ count: `${table_names.schedule_bookings}.id` })
        .groupBy(`${table_names.users}.id`, `${table_names.users}.username`)
        .orderBy('count', 'desc');

      const byCategory = await db(table_names.schedule_bookings)
        .join(table_names.provider_subcategories, `${table_names.provider_subcategories}.user_id`, `${table_names.schedule_bookings}.provider_id`)
        .join(table_names.sub_category, `${table_names.sub_category}.id`, `${table_names.provider_subcategories}.sub_category_id`)
        .join(table_names.categories, `${table_names.categories}.id`, `${table_names.sub_category}.category_id`)
        .select(`${table_names.categories}.name as category`)
        .count({ count: `${table_names.schedule_bookings}.id` })
        .groupBy(`${table_names.categories}.name`)
        .orderBy('count', 'desc');

      const recent = await db(table_names.schedule_bookings)
        .join(`${table_names.users} as providers`, 'providers.id', `${table_names.schedule_bookings}.provider_id`)
        .join(`${table_names.users} as customers`, 'customers.id', `${table_names.schedule_bookings}.customer_id`)
        .select(
          `${table_names.schedule_bookings}.id`,
          `${table_names.schedule_bookings}.booking_date`,
          `${table_names.schedule_bookings}.start_time`,
          `${table_names.schedule_bookings}.status`,
          `${table_names.schedule_bookings}.created`,
          'providers.username as provider_username',
          'customers.username as customer_username',
        )
        .orderBy(`${table_names.schedule_bookings}.created`, 'desc')
        .limit(50);

      return {
        data: {
          total_by_status: Object.fromEntries(totalByStatus.map(r => [r.status, Number(r.count)])),
          unique_customers: Number(uniqueCustomers?.count || 0),
          unique_providers: Number(uniqueProviders?.count || 0),
          by_provider: byProvider.map(r => ({ ...r, count: Number(r.count) })),
          by_category: byCategory.map(r => ({ ...r, count: Number(r.count) })),
          recent: recent.map(r => ({ ...r, start_time: toHHMM(r.start_time) })),
        },
      };
    } catch (error) {
      console.error('schedule.stats: ', error);
      return { error };
    }
  }
}

module.exports = ScheduleHandler;

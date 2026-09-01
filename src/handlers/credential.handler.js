const { table_names, user_roles } = require('#src/globals/constants');
const db = require('#src/helpers/db');
const { writeProofFile } = require('#src/helpers/image');

const VALID_TYPES = ['education', 'experience', 'certification', 'project'];

class CredentialHandler {
  // Public: a customer deciding whether to trust a provider needs to see
  // this on the provider's profile without logging in — same shape as
  // portfolio.list (see router: NOT behind auth_hook).
  static async list(request) {
    try {
      const userId = request.query?.user_id;
      if (!userId) {
        return { message: 'user_id is required' };
      }
      const credentials = await db(table_names.provider_credentials)
        .where({ user_id: userId })
        .orderBy('sort_order', 'asc')
        .orderBy('created', 'desc');
      return { data: credentials };
    } catch (error) {
      console.error('credential.list: ', error);
      return { error };
    }
  }

  static async create(request) {
    try {
      if (request.userType !== 'user' || request.user.role !== user_roles.provider) {
        return { message: 'Only service provider accounts can add credentials' };
      }

      // The proof file is optional, unlike portfolio.upload's mandatory
      // file — so we can't use request.file() (it returns the FIRST file
      // part only, and gives up access to any text fields at all if there
      // turns out to be no file in the request). Instead walk every part
      // ourselves: field parts populate `fields`, at most one file part is
      // buffered for writeProofFile below.
      const fields = {};
      let filePart = null;
      let fileBuffer = null;

      if (request.isMultipart()) {
        for await (const part of request.parts()) {
          if (part.file) {
            filePart = part;
            fileBuffer = await part.toBuffer();
          } else {
            fields[part.fieldname] = part.value;
          }
        }
      } else {
        Object.assign(fields, request.body || {});
      }

      const { type, title, organization, period, description } = fields;

      if (!VALID_TYPES.includes(type)) {
        return { message: `type must be one of: ${VALID_TYPES.join(', ')}` };
      }
      if (!title || !String(title).trim()) {
        return { message: 'title is required' };
      }

      let proof_url = null;
      if (filePart) {
        let safeName;
        try {
          safeName = await writeProofFile('credentials', filePart.filename, fileBuffer);
        } catch (validationError) {
          return { message: validationError.message };
        }
        proof_url = `/public/credentials/icon/${safeName}`;
      }

      const [id] = await db(table_names.provider_credentials).insert({
        user_id: request.user.id,
        type,
        title: String(title).trim(),
        organization: organization ? String(organization).trim() : null,
        period: period ? String(period).trim() : null,
        description: description ? String(description).trim() : null,
        proof_url,
        sort_order: 0,
        created: new Date(),
      });

      const newCredential = await db(table_names.provider_credentials).where({ id }).first();
      return { data: newCredential };
    } catch (error) {
      console.error('credential.create: ', error);
      return { error };
    }
  }

  static async delete(request) {
    try {
      const id = request.query?.id;
      if (!id) {
        return { message: 'id is required' };
      }
      // Only the owning provider may delete their own credential.
      const deleted = await db(table_names.provider_credentials)
        .where({ id, user_id: request.user.id })
        .del();
      return { data: { deleted: deleted > 0 } };
    } catch (error) {
      console.error('credential.delete: ', error);
      return { error };
    }
  }
}

module.exports = CredentialHandler;

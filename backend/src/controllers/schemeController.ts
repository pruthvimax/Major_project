import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Scheme, { IScheme, SCHEME_CATEGORIES, SCHEME_LABELS, SchemeLabel } from '../models/Scheme';
import SchemeQuery, { SCHEME_QUERY_STATUSES } from '../models/SchemeQuery';

interface AuthRequest extends Request {
  user?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isValidId = (id: unknown): id is string =>
  typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/** Accepts an array of strings or a newline / comma separated string. */
const normalizeDocuments = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((v) => asTrimmedString(v))
      .filter((v) => v.length > 0)
      .slice(0, 30);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .slice(0, 30);
  }
  return [];
};

const normalizeLabels = (value: unknown): SchemeLabel[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<SchemeLabel>();
  value.forEach((v) => {
    if (typeof v === 'string' && (SCHEME_LABELS as readonly string[]).includes(v)) {
      unique.add(v as SchemeLabel);
    }
  });
  return Array.from(unique);
};

/** Returns `undefined` when the value is absent, `null` to clear, or a Date. */
const parseDeadline = (value: unknown): Date | null | undefined | 'invalid' => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return 'invalid';
  return date;
};

const isValidWebsite = (value: string): boolean =>
  value === '' || /^https?:\/\/[^\s]+$/i.test(value);

const isValidPhone = (value: string): boolean =>
  value === '' || /^[+\d][\d\s\-()]{5,19}$/.test(value);

/** Shapes a scheme document for the client, adding per-user save state. */
const serializeScheme = (scheme: IScheme, userId?: string) => {
  const savedBy = (scheme.savedBy || []).map((id) => id.toString());
  return {
    _id: scheme._id,
    name: scheme.name,
    description: scheme.description,
    benefits: scheme.benefits,
    eligibility: scheme.eligibility,
    requiredDocuments: scheme.requiredDocuments,
    applicationDeadline: scheme.applicationDeadline,
    officialWebsite: scheme.officialWebsite,
    contactNumber: scheme.contactNumber,
    category: scheme.category,
    isActive: scheme.isActive,
    labels: scheme.labels,
    viewCount: scheme.viewCount,
    savedCount: savedBy.length,
    isSaved: userId ? savedBy.includes(userId) : false,
    createdAt: scheme.createdAt,
    updatedAt: scheme.updatedAt,
  };
};

// ---------------------------------------------------------------------------
// Schemes
// ---------------------------------------------------------------------------

// @desc    List schemes (farmers see active only, admins see everything)
// @route   GET /api/schemes?category=&search=&saved=true&status=active|inactive|all
// @access  Private
export const getSchemes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    const isAdmin = req.user?.role === 'admin';
    const { category, search, saved, status, label } = req.query;

    const filter: Record<string, unknown> = {};

    if (isAdmin) {
      if (status === 'active') filter.isActive = true;
      else if (status === 'inactive') filter.isActive = false;
    } else {
      filter.isActive = true;
    }

    if (typeof category === 'string' && (SCHEME_CATEGORIES as readonly string[]).includes(category)) {
      filter.category = category;
    }

    if (typeof label === 'string' && (SCHEME_LABELS as readonly string[]).includes(label)) {
      filter.labels = label;
    }

    if (saved === 'true' && userId) {
      filter.savedBy = userId;
    }

    if (typeof search === 'string' && search.trim().length > 0) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ name: regex }, { description: regex }, { eligibility: regex }, { category: regex }];
    }

    const schemes = await Scheme.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: schemes.length,
      schemes: schemes.map((s) => serializeScheme(s, userId)),
    });
  } catch (error: any) {
    console.error('Get schemes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get a single scheme (increments view count for non-admin users)
// @route   GET /api/schemes/:id
// @access  Private
export const getSchemeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid scheme id' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?._id?.toString();

    const scheme = isAdmin
      ? await Scheme.findById(id)
      : await Scheme.findOneAndUpdate(
          { _id: id, isActive: true },
          { $inc: { viewCount: 1 } },
          { new: true }
        );

    if (!scheme) {
      res.status(404).json({ success: false, message: 'Scheme not found' });
      return;
    }

    res.status(200).json({ success: true, scheme: serializeScheme(scheme, userId) });
  } catch (error: any) {
    console.error('Get scheme error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/** Validates and extracts the writable scheme fields from a request body. */
const buildSchemePayload = (
  body: Record<string, unknown>,
  partial: boolean
): { payload: Record<string, unknown> } | { error: string } => {
  const payload: Record<string, unknown> = {};

  const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has('name')) {
    const name = asTrimmedString(body.name);
    if (name.length < 3) return { error: 'Scheme name must be at least 3 characters' };
    payload.name = name;
  }

  if (!partial || has('description')) {
    const description = asTrimmedString(body.description);
    if (description.length < 10) return { error: 'Description must be at least 10 characters' };
    payload.description = description;
  }

  if (!partial || has('eligibility')) {
    const eligibility = asTrimmedString(body.eligibility);
    if (eligibility.length < 5) return { error: 'Please describe the eligibility criteria' };
    payload.eligibility = eligibility;
  }

  if (!partial || has('category')) {
    const category = asTrimmedString(body.category);
    if (!(SCHEME_CATEGORIES as readonly string[]).includes(category)) {
      return { error: 'Please select a valid category' };
    }
    payload.category = category;
  }

  if (has('benefits')) payload.benefits = asTrimmedString(body.benefits);
  if (has('requiredDocuments')) payload.requiredDocuments = normalizeDocuments(body.requiredDocuments);

  if (has('officialWebsite')) {
    const website = asTrimmedString(body.officialWebsite);
    if (!isValidWebsite(website)) return { error: 'Official website must start with http:// or https://' };
    payload.officialWebsite = website;
  }

  if (has('contactNumber')) {
    const phone = asTrimmedString(body.contactNumber);
    if (!isValidPhone(phone)) return { error: 'Please enter a valid contact number' };
    payload.contactNumber = phone;
  }

  if (has('applicationDeadline')) {
    const deadline = parseDeadline(body.applicationDeadline);
    if (deadline === 'invalid') return { error: 'Application deadline is not a valid date' };
    if (deadline !== undefined) payload.applicationDeadline = deadline;
  }

  if (has('labels')) payload.labels = normalizeLabels(body.labels);
  if (has('isActive')) payload.isActive = Boolean(body.isActive);

  return { payload };
};

// @desc    Create a scheme
// @route   POST /api/schemes
// @access  Private/Admin
export const createScheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = buildSchemePayload(req.body || {}, false);
    if ('error' in result) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    const scheme = await Scheme.create({
      ...result.payload,
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Scheme published successfully',
      scheme: serializeScheme(scheme, req.user?._id?.toString()),
    });
  } catch (error: any) {
    console.error('Create scheme error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update a scheme (also used for activate/deactivate and labels)
// @route   PUT /api/schemes/:id
// @access  Private/Admin
export const updateScheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid scheme id' });
      return;
    }

    const result = buildSchemePayload(req.body || {}, true);
    if ('error' in result) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    if (Object.keys(result.payload).length === 0) {
      res.status(400).json({ success: false, message: 'Nothing to update' });
      return;
    }

    const scheme = await Scheme.findByIdAndUpdate(id, result.payload, {
      new: true,
      runValidators: true,
    });

    if (!scheme) {
      res.status(404).json({ success: false, message: 'Scheme not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Scheme updated successfully',
      scheme: serializeScheme(scheme, req.user?._id?.toString()),
    });
  } catch (error: any) {
    console.error('Update scheme error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Delete a scheme and its farmer queries
// @route   DELETE /api/schemes/:id
// @access  Private/Admin
export const deleteScheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid scheme id' });
      return;
    }

    const scheme = await Scheme.findByIdAndDelete(id);
    if (!scheme) {
      res.status(404).json({ success: false, message: 'Scheme not found' });
      return;
    }

    await SchemeQuery.deleteMany({ scheme: id });

    res.status(200).json({ success: true, message: 'Scheme deleted successfully' });
  } catch (error: any) {
    console.error('Delete scheme error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Save / unsave a scheme for the logged-in farmer
// @route   POST /api/schemes/:id/save
// @access  Private/Farmer
export const toggleSaveScheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid scheme id' });
      return;
    }

    const scheme = await Scheme.findOne({ _id: id, isActive: true });
    if (!scheme) {
      res.status(404).json({ success: false, message: 'Scheme not found' });
      return;
    }

    const alreadySaved = scheme.savedBy.some((s) => s.toString() === userId.toString());
    const updated = await Scheme.findByIdAndUpdate(
      id,
      alreadySaved ? { $pull: { savedBy: userId } } : { $addToSet: { savedBy: userId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: alreadySaved ? 'Scheme removed from saved' : 'Scheme saved',
      isSaved: !alreadySaved,
      scheme: updated ? serializeScheme(updated, userId.toString()) : undefined,
    });
  } catch (error: any) {
    console.error('Toggle save scheme error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Scheme analytics for the admin dashboard
// @route   GET /api/schemes/analytics
// @access  Private/Admin
export const getSchemeAnalytics = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [totalSchemes, activeSchemes, totalQueries, resolvedQueries, openQueries, mostViewed] =
      await Promise.all([
        Scheme.countDocuments(),
        Scheme.countDocuments({ isActive: true }),
        SchemeQuery.countDocuments(),
        SchemeQuery.countDocuments({ status: 'resolved' }),
        SchemeQuery.countDocuments({ status: 'open' }),
        Scheme.findOne({ viewCount: { $gt: 0 } })
          .sort({ viewCount: -1, updatedAt: -1 })
          .select('name category viewCount'),
      ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalSchemes,
        activeSchemes,
        totalQueries,
        resolvedQueries,
        openQueries,
        mostViewedScheme: mostViewed
          ? {
              _id: mostViewed._id,
              name: mostViewed.name,
              category: mostViewed.category,
              viewCount: mostViewed.viewCount,
            }
          : null,
      },
    });
  } catch (error: any) {
    console.error('Scheme analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ---------------------------------------------------------------------------
// Farmer ↔ Admin queries
// ---------------------------------------------------------------------------

const QUERY_POPULATE = [
  { path: 'scheme', select: 'name category isActive' },
  { path: 'farmer', select: 'name email phone' },
  { path: 'respondedBy', select: 'name' },
];

// @desc    Ask a question about a scheme
// @route   POST /api/schemes/:id/queries
// @access  Private/Farmer
export const createSchemeQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const question = asTrimmedString(req.body?.question);

    if (!isValidId(id)) {
      res.status(400).json({ success: false, message: 'Invalid scheme id' });
      return;
    }
    if (question.length < 5) {
      res.status(400).json({ success: false, message: 'Please enter a question (at least 5 characters)' });
      return;
    }

    const scheme = await Scheme.findOne({ _id: id, isActive: true }).select('_id');
    if (!scheme) {
      res.status(404).json({ success: false, message: 'Scheme not found' });
      return;
    }

    const created = await SchemeQuery.create({
      scheme: id,
      farmer: req.user._id,
      question,
    });
    const query = await SchemeQuery.findById(created._id).populate(QUERY_POPULATE);

    res.status(201).json({
      success: true,
      message: 'Your question has been submitted. An administrator will reply soon.',
      query,
    });
  } catch (error: any) {
    console.error('Create scheme query error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Farmer's own scheme questions
// @route   GET /api/schemes/queries/mine?schemeId=
// @access  Private/Farmer
export const getMySchemeQueries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = { farmer: req.user._id };
    const { schemeId } = req.query;
    if (isValidId(schemeId)) filter.scheme = schemeId;

    const queries = await SchemeQuery.find(filter).populate(QUERY_POPULATE).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: queries.length, queries });
  } catch (error: any) {
    console.error('Get my scheme queries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    All farmer queries (admin)
// @route   GET /api/schemes/queries?status=open|answered|resolved&schemeId=
// @access  Private/Admin
export const getAllSchemeQueries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, unknown> = {};
    const { status, schemeId } = req.query;
    if (typeof status === 'string' && (SCHEME_QUERY_STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }
    if (isValidId(schemeId)) filter.scheme = schemeId;

    const queries = await SchemeQuery.find(filter).populate(QUERY_POPULATE).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: queries.length, queries });
  } catch (error: any) {
    console.error('Get all scheme queries error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Reply to / resolve a farmer query
// @route   PUT /api/schemes/queries/:queryId   body: { adminResponse?, status? }
// @access  Private/Admin
export const respondToSchemeQuery = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { queryId } = req.params;
    if (!isValidId(queryId)) {
      res.status(400).json({ success: false, message: 'Invalid query id' });
      return;
    }

    const hasResponse = Object.prototype.hasOwnProperty.call(req.body || {}, 'adminResponse');
    const adminResponse = asTrimmedString(req.body?.adminResponse);
    const requestedStatus = asTrimmedString(req.body?.status);

    if (requestedStatus && !(SCHEME_QUERY_STATUSES as readonly string[]).includes(requestedStatus)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const existing = await SchemeQuery.findById(queryId);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Query not found' });
      return;
    }

    const update: Record<string, unknown> = {};
    const now = new Date();

    if (hasResponse) {
      if (adminResponse.length < 2) {
        res.status(400).json({ success: false, message: 'Please enter a reply' });
        return;
      }
      update.adminResponse = adminResponse;
      update.respondedBy = req.user._id;
      update.respondedAt = now;
    }

    let nextStatus = requestedStatus || (hasResponse ? 'answered' : '');
    if (nextStatus === 'resolved' && !existing.adminResponse && !hasResponse) {
      res.status(400).json({ success: false, message: 'Reply to the farmer before resolving the query' });
      return;
    }
    if (nextStatus === 'answered' && !existing.adminResponse && !hasResponse) {
      nextStatus = 'open';
    }

    if (nextStatus) {
      update.status = nextStatus;
      update.resolvedAt = nextStatus === 'resolved' ? now : null;
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ success: false, message: 'Nothing to update' });
      return;
    }

    const query = await SchemeQuery.findByIdAndUpdate(queryId, update, {
      new: true,
      runValidators: true,
    }).populate(QUERY_POPULATE);

    res.status(200).json({
      success: true,
      message: nextStatus === 'resolved' ? 'Query marked as resolved' : 'Reply sent to farmer',
      query,
    });
  } catch (error: any) {
    console.error('Respond to scheme query error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

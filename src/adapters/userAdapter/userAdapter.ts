import {parseArangoId, parseChar, parseEmail, parseId, parseNum, parseString, parseVarChar} from '@nlabs/utils';
import {z} from 'zod';

import {parseDocument, removeEmptyKeys} from '../arangoAdapter/arangoAdapter.js';
import {parseReaktorDate, parseReaktorItemId, parseReaktorName, parseReaktorType} from '../reaktorAdapter/reaktorAdapter.js';
import {parseTag} from '../tagAdapter/tagAdapter.js';

export interface User {
  [key: string]: any;
  _id?: string;
  _key?: string;
  active?: boolean;
  added?: number;
  bankId?: string;
  city?: string;
  country?: string;
  currency?: string;
  deviceToken?: string;
  dob?: number;
  email?: string;
  first?: string;
  gender?: string;
  id?: string;
  imageId?: string;
  last?: string;
  lastActive?: number;
  locale?: string;
  mailingList?: boolean;
  name?: string;
  password?: string;
  phone?: string;
  salt?: string;
  state?: string;
  street1?: string;
  street2?: string;
  stripeAccountId?: string;
  stripeCustomerId?: string;
  tags?: any[];
  timezone?: string;
  type?: string;
  updated?: number;
  userAccess?: number;
  userId?: string;
  username?: string;
  verifiedEmail?: boolean;
  verifiedEmailCode?: number;
  verifiedEmailExpires?: number;
  verifiedPhone?: boolean;
  verifiedPhoneExpires?: number;
  verifiedSmsCode?: number;
  zip?: string;
}

export class UserValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'UserValidationError';
  }
}

const UserInputSchema = z.object({
  _id: z.string().optional(),
  _key: z.string().optional(),
  active: z.boolean().optional(),
  added: z.number().optional(),
  bankId: z.string().max(160).optional(),
  city: z.string().max(160).optional(),
  country: z.string().length(2).optional(),
  currency: z.string().length(3).optional(),
  deviceToken: z.string().max(160).optional(),
  dob: z.number().optional(),
  email: z.email().optional(),
  first: z.string().max(160).optional(),
  gender: z.string().length(1).optional(),
  id: z.string().optional(),
  imageId: z.string().optional(),
  last: z.string().max(160).optional(),
  lastActive: z.number().optional(),
  locale: z.string().max(5).optional(),
  mailingList: z.boolean().optional(),
  name: z.string().max(160).optional(),
  password: z.string().max(160).optional(),
  phone: z.string().max(20).optional(),
  salt: z.string().max(160).optional(),
  state: z.string().length(2).optional(),
  street1: z.string().max(160).optional(),
  street2: z.string().max(160).optional(),
  stripeAccountId: z.string().max(160).optional(),
  stripeCustomerId: z.string().max(160).optional(),
  tags: z.array(z.any()).optional(),
  timezone: z.string().max(160).optional(),
  type: z.string().max(160).optional(),
  updated: z.number().optional(),
  userAccess: z.number().optional(),
  userId: z.string().optional(),
  username: z.string().max(160).optional(),
  verifiedEmail: z.boolean().optional(),
  verifiedEmailCode: z.number().optional(),
  verifiedEmailExpires: z.number().optional(),
  verifiedPhone: z.boolean().optional(),
  verifiedPhoneExpires: z.number().optional(),
  verifiedSmsCode: z.number().optional(),
  zip: z.string().max(20).optional()
}).loose();

const validatePhone = (phone?: string): string | undefined => {
  if(!phone) {
    return undefined;
  }
  const cleaned = phone.replace(/\D/g, '');
  if(cleaned.length < 10 || cleaned.length > 15) {
    throw new UserValidationError('Invalid phone number format', 'phone');
  }
  return `+${cleaned}`;
};

const validateCountry = (country?: string): string | undefined => {
  if(!country) {
    return undefined;
  }
  const upper = country.toUpperCase();
  if(!/^[A-Z]{2}$/.test(upper)) {
    throw new UserValidationError('Country must be a 2-letter ISO code', 'country');
  }
  return upper;
};

const validateState = (state?: string): string | undefined => {
  if(!state) {
    return undefined;
  }
  const upper = state.toUpperCase();
  if(!/^[A-Z]{2}$/.test(upper)) {
    throw new UserValidationError('State must be a 2-letter code', 'state');
  }
  return upper;
};

const validateGender = (gender?: string): string | undefined => {
  if(!gender) {
    return undefined;
  }
  const upper = gender.toUpperCase();
  if(!/^[MF]$/.test(upper)) {
    throw new UserValidationError('Gender must be M or F', 'gender');
  }
  return upper;
};

const userCache = new Map<string, User>();

export const validateUserInput = (user: unknown): User => {
  try {
    const validated = UserInputSchema.parse(user);
    return validated as User;
  } catch(error) {
    if(error instanceof z.ZodError) {
      const fieldErrors = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new UserValidationError(`User validation failed: ${fieldErrors}`);
    }
    throw error;
  }
};

export const formatUserOutput = (user: User): User => {
  const {password, salt, verifiedEmailCode, verifiedSmsCode, ...safeUser} = user;
  return safeUser;
};

export const parseUser = (user: User): User => {
  try {
    const parsed = performUserTransformation(user);
    return parsed;
  } catch(error) {
    if(error instanceof UserValidationError) {
      throw error;
    }
    throw new UserValidationError(`User parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const performUserTransformation = (user: User): User => {
  const {
    _id,
    _key,
    active,
    bankId,
    city,
    country,
    currency,
    deviceToken,
    dob,
    email,
    first,
    gender,
    id,
    imageId,
    last,
    lastActive,
    locale,
    mailingList,
    name,
    password,
    phone,
    salt,
    state,
    street1,
    street2,
    stripeAccountId,
    stripeCustomerId,
    tags,
    timezone,
    type,
    userAccess,
    userId,
    username,
    verifiedEmail,
    verifiedEmailCode,
    verifiedEmailExpires,
    verifiedPhone,
    verifiedPhoneExpires,
    verifiedSmsCode,
    zip
  } = user;
  const transformed = {
    ...parseDocument(user),
    ...((_id || id || _key || userId) && {id: parseArangoId(_id || id || `users/${_key || userId}`)}),
    ...((_key || userId) && {userId: parseId(_key || userId || '')}),
    ...(active !== undefined && {active: !!active}),
    ...(bankId && {bankId: parseVarChar(bankId, 160)}),
    ...(city && {city: parseVarChar(city, 160)}),
    ...(country && {country: validateCountry(country)}),
    ...(currency && {currency: parseChar(currency, 3).toUpperCase()}),
    ...(deviceToken && {deviceToken: parseVarChar(deviceToken, 160)}),
    ...(dob !== undefined && {dob: parseReaktorDate(dob)}),
    ...(email && {email: parseEmail(email)}),
    ...(first && {first: parseVarChar(first, 160)}),
    ...(gender && {gender: validateGender(gender)}),
    ...(imageId && {imageId: parseReaktorItemId(imageId)}),
    ...(last && {last: parseVarChar(last, 160)}),
    ...(lastActive !== undefined && {lastActive: parseReaktorDate(lastActive)}),
    ...(locale && {locale: parseString(locale, 5)}),
    ...(mailingList !== undefined && {mailingList: !!mailingList}),
    ...(name && {name: parseReaktorName(name)}),
    ...(password && {password: parseVarChar(password, 160)}),
    ...(phone && {phone: validatePhone(phone)}),
    ...(salt && {salt: parseVarChar(salt, 160)}),
    ...(state && {state: validateState(state)}),
    ...(street1 && {street1: parseVarChar(street1, 160)}),
    ...(street2 && {street2: parseVarChar(street2, 160)}),
    ...(stripeAccountId && {stripeAccountId: parseVarChar(stripeAccountId, 160)}),
    ...(stripeCustomerId && {stripeCustomerId: parseVarChar(stripeCustomerId, 160)}),
    ...(tags?.length && {tags: tags.filter((tag) => !!tag).map((tag) => parseTag(tag))}),
    ...(timezone && {timezone: parseString(timezone, 160)}),
    ...(type && {type: parseReaktorType(type)}),
    ...(userAccess !== undefined && {userAccess: userAccess ? parseNum(userAccess) : 0}),
    ...(username && {username: parseVarChar(username, 160)}),
    ...(verifiedEmail !== undefined && {verifiedEmail: !!verifiedEmail}),
    ...(verifiedEmailCode !== undefined && {verifiedEmailCode: parseNum(verifiedEmailCode, 10)}),
    ...(verifiedEmailExpires !== undefined && {verifiedEmailExpires: parseNum(verifiedEmailExpires, 10)}),
    ...(verifiedPhone !== undefined && {verifiedPhone: !!verifiedPhone}),
    ...(verifiedPhoneExpires !== undefined && {verifiedPhoneExpires: parseNum(verifiedPhoneExpires, 10)}),
    ...(verifiedSmsCode !== undefined && {verifiedSmsCode: parseNum(verifiedSmsCode, 10)}),
    ...(zip && {zip: parseVarChar(zip, 20)})
  };

  const result = removeEmptyKeys(transformed);

  if(user._id) {
    result.id = user._id;
    result._id = user._id;
  } else if(user.id && !result.id) {
    result.id = user.id;
    result._id = user.id;
  }

  if(user._key) {
    result.userId = user._key;
    result._key = user._key;
  } else if(user.userId && !result.userId) {
    result.userId = user.userId;
    result._key = user.userId;
  }

  if(user.userId && !result._key) {
    result._key = user.userId;
  }

  if(user.id && !result._id) {
    result._id = user.id;
  }

  return result;
};

export const clearUserCache = (): void => {
  userCache.clear();
};

export const getUserCacheSize = (): number => userCache.size;

export {userCache};

export const parseUserLegacy = (user: User): User => parseUser(user);
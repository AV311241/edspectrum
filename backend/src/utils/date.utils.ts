import { AppError } from './appError.utils';
import { HttpStatusCode } from '../constants/httpStatus.constants';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string, fieldName = 'date'): Date {
  if (!ISO_DATE_REGEX.test(value)) {
    throw new AppError(`${fieldName} must be formatted YYYY-MM-DD`, HttpStatusCode.BAD_REQUEST);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${fieldName} is not a valid calendar date`, HttpStatusCode.BAD_REQUEST);
  }

  return parsed;
}

export function toIsoDateString(value: Date): string {
  return value.toISOString().split('T')[0];
}

export function getUtcMonthRange(year: number, month: number): { start: Date; end: Date } {
  if (month < 1 || month > 12) {
    throw new AppError('month must be between 1 and 12', HttpStatusCode.BAD_REQUEST);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}
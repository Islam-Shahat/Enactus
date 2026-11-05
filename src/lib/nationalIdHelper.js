// src/lib/nationalIdHelper.js

/**
 * Official Egyptian Governorates mapped from National ID 2-digit codes (digits 8-9).
 */
export const EGYPTIAN_GOVERNORATES = {
  '01': { ar: 'القاهرة', en: 'Cairo' },
  '02': { ar: 'الإسكندرية', en: 'Alexandria' },
  '03': { ar: 'بورسعيد', en: 'Port Said' },
  '04': { ar: 'السويس', en: 'Suez' },
  '11': { ar: 'دمياط', en: 'Damietta' },
  '12': { ar: 'الدقهلية', en: 'Dakahlia' },
  '13': { ar: 'الشرقية', en: 'Sharqia' },
  '14': { ar: 'القليوبية', en: 'Qalyubia' },
  '15': { ar: 'كفر الشيخ', en: 'Kafr El Sheikh' },
  '16': { ar: 'الغربية', en: 'Gharbia' },
  '17': { ar: 'المنوفية', en: 'Monufia' },
  '18': { ar: 'البحيرة', en: 'Beheira' },
  '19': { ar: 'الإسماعيلية', en: 'Ismailia' },
  '21': { ar: 'الجيزة', en: 'Giza' },
  '22': { ar: 'بني سويف', en: 'Beni Suef' },
  '23': { ar: 'الفيوم', en: 'Fayoum' },
  '24': { ar: 'المنيا', en: 'Minya' },
  '25': { ar: 'أسيوط', en: 'Asyut' },
  '26': { ar: 'سوهاج', en: 'Sohag' },
  '27': { ar: 'قنا', en: 'Qena' },
  '28': { ar: 'أسوان', en: 'Aswan' },
  '29': { ar: 'الأقصر', en: 'Luxor' },
  '31': { ar: 'البحر الأحمر', en: 'Red Sea' },
  '32': { ar: 'الوادي الجديد', en: 'New Valley' },
  '33': { ar: 'مطروح', en: 'Matrouh' },
  '34': { ar: 'شمال سيناء', en: 'North Sinai' },
  '35': { ar: 'جنوب سيناء', en: 'South Sinai' },
  '88': { ar: 'خارج الجمهورية', en: 'Abroad' },
};

/**
 * Validates and decodes a 14-digit Egyptian National ID.
 * Extracts century, birth date, age, governorate, and gender.
 */
export function parseEgyptianNationalId(nid) {
  if (!nid || typeof nid !== 'string') {
    return { isValid: false, error: 'الرقم القومي مطلوب' };
  }

  const clean = nid.trim();
  if (!/^\d{14}$/.test(clean)) {
    return { isValid: false, error: 'الرقم القومي يجب أن يتكون من 14 رقماً' };
  }

  const centuryDigit = parseInt(clean[0], 10);
  if (centuryDigit !== 2 && centuryDigit !== 3) {
    return { isValid: false, error: 'الرقم القومي غير صحيح (رقم القرن غير معروف)' };
  }

  const century = centuryDigit === 2 ? 1900 : 2000;
  const yearTwoDigits = parseInt(clean.substring(1, 3), 10);
  const birthYear = century + yearTwoDigits;
  const birthMonth = parseInt(clean.substring(3, 5), 10);
  const birthDay = parseInt(clean.substring(5, 7), 10);

  if (birthMonth < 1 || birthMonth > 12) {
    return { isValid: false, error: 'الرقم القومي غير صحيح (الشهر غير صالح)' };
  }

  // Validate day according to month & leap year
  const daysInMonth = new Date(birthYear, birthMonth, 0).getDate();
  if (birthDay < 1 || birthDay > daysInMonth) {
    return { isValid: false, error: 'الرقم القومي غير صحيح (اليوم غير صالح)' };
  }

  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  const now = new Date();

  if (birthDate > now) {
    return { isValid: false, error: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل' };
  }

  // Calculate age accurately
  let age = now.getFullYear() - birthYear;
  const monthDiff = now.getMonth() - (birthMonth - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDay)) {
    age -= 1;
  }

  // Governorate
  const govCode = clean.substring(7, 9);
  const governorate = EGYPTIAN_GOVERNORATES[govCode] || { ar: 'أخرى', en: 'Other' };

  // Gender: digit 13 (second to last) odd = male, even = female
  const seqDigit = parseInt(clean[12], 10);
  const isMale = seqDigit % 2 !== 0;
  const gender = isMale
    ? { key: 'male', ar: 'ذكر', en: 'Male' }
    : { key: 'female', ar: 'أنثى', en: 'Female' };

  const pad = (n) => String(n).padStart(2, '0');
  const birthDateStr = `${birthYear}-${pad(birthMonth)}-${pad(birthDay)}`;

  return {
    isValid: true,
    clean,
    birthYear,
    birthMonth,
    birthDay,
    birthDateStr,
    birthDate,
    age,
    governorate,
    gender,
  };
}

/**
 * Checks if a string is a 7-digit member code (e.g., 2026001).
 */
export function isValidMemberCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^\d{7}$/.test(code.trim());
}

/**
 * Formats a season year (e.g. 2026) and a sequential number (e.g. 1) into a 7-digit code (e.g. 2026001).
 */
export function formatMemberCode(year, sequenceNumber) {
  const y = String(year || new Date().getFullYear()).slice(0, 4);
  const seq = String(sequenceNumber || 1).padStart(3, '0');
  return `${y}${seq}`;
}


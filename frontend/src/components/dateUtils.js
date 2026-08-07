export const normalizeToIsoDate = (value) => {
    if (!value && value !== 0) return '';

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return '';
        const yyyy = value.getFullYear();
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const dd = String(value.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    const raw = String(value).trim();
    if (!raw) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    let match = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (match) {
        const [, dd, mm, yyyy] = match;
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }

    match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
        const [, dd, mm, yyyy] = match;
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }

    match = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
    if (match) {
        const months = {
            jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
            jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
        };
        const [, ddRaw, monRaw, yyRaw] = match;
        const mm = months[String(monRaw).toLowerCase()];
        if (mm) {
            const yyyy = String(yyRaw).length === 2 ? `20${yyRaw}` : String(yyRaw);
            return `${yyyy}-${mm}-${String(ddRaw).padStart(2, '0')}`;
        }
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const formatDateDDMMYYYY = (value) => {
    const iso = normalizeToIsoDate(value);
    if (!iso) return value ? String(value) : '';
    const [yyyy, mm, dd] = iso.split('-');
    return `${dd}-${mm}-${yyyy}`;
};

export const todayIsoDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const lastVoucherDateAllKey = 'RG_lastVoucherDate:all';

export const getLastVoucherDateAll = () => {
    try {
        return normalizeToIsoDate(localStorage.getItem(lastVoucherDateAllKey));
    } catch {
        return '';
    }
};

export const setLastVoucherDateAll = (value) => {
    const iso = normalizeToIsoDate(value);
    if (!iso) return;
    try {
        localStorage.setItem(lastVoucherDateAllKey, iso);
    } catch {}
};

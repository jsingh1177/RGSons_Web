export const formatVoucherQty = (value, decimals = 2) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    if (Math.abs(num) < 1e-12) return '0';
    return num.toFixed(decimals).replace(/\.?0+$/, '');
};

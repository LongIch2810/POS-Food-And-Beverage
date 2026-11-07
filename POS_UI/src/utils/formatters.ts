// POS-F&B Formatters per DESIGN.md §10 & §12.3

const vndFormatter = new Intl.NumberFormat('vi-VN');
const shopDate = new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' });
const shopTime = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Ho_Chi_Minh', hour:'2-digit',minute:'2-digit',hourCycle:'h23' });

/**
 * Định dạng tiền tệ VND từ bigint.
 * Số âm dùng ký tự trừ thực (U+2212) thay cho gạch nối.
 * Đơn vị 'đ' dính liền sau số tiền.
 */
export function formatVND(amount: bigint | number): string {
  const bigVal = typeof amount === 'bigint' ? amount : BigInt(Math.round(amount));
  const isNegative = bigVal < 0n;
  const absVal = isNegative ? -bigVal : bigVal;
  const formatted = vndFormatter.format(absVal);
  return (isNegative ? '\u2212' : '') + formatted + 'đ';
}

/**
 * Định dạng ngày giờ chuẩn Việt Nam (Asia/Ho_Chi_Minh).
 * Ngày: dd/MM/yyyy
 */
export function formatDateVN(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  const [y,m,d] = shopDate.format(date).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Định dạng giờ 24 giờ: HH:mm
 */
export function formatTimeVN(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return shopTime.format(date);
}

/**
 * Định dạng ngày và giờ: dd/MM/yyyy HH:mm
 */
export function formatDateTimeVN(dateInput: string | Date): string {
  return `${formatDateVN(dateInput)} ${formatTimeVN(dateInput)}`;
}

/**
 * Định dạng thời lượng theo chữ tiếng Việt: "3 giờ 12 phút", "25 phút"
 */
export function formatDuration(startedAt: string | Date, endedAt?: string | Date): string {
  const start = typeof startedAt === 'string' ? new Date(startedAt).getTime() : startedAt.getTime();
  const end = endedAt ? (typeof endedAt === 'string' ? new Date(endedAt).getTime() : endedAt.getTime()) : Date.now();
  const diffMs = Math.max(end - start, 0);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} phút`;
  }
  return `${hours} giờ ${minutes} phút`;
}

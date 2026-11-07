export function toShopLocal(iso: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',
    day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).format(new Date(iso)).replace(' ','T');
}

export function fromShopLocal(local: string): string {
  return new Date(`${local}:00+07:00`).toISOString();
}

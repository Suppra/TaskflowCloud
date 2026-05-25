export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

export const daysUntil = (dueDate: string) => {
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

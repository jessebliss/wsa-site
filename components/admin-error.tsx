export function AdminError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-primary" role="alert">
      {message}
    </p>
  );
}

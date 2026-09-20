export default function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-md border border-lose/40 bg-lose/10 px-3 py-2 text-sm text-lose">
      {message}
    </p>
  );
}

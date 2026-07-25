export default function OAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_45%)]"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

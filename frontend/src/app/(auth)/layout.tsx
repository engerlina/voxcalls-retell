export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-secondary">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  );
}

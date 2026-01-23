export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <section id="contents" className="bg-white">
        {children}
      </section>
    </div>
  );
}

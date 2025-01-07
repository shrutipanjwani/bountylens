import DiscoverFeed from "@/components/DiscoverFeed";
import Header from "@/components/Header";

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Header />
        <main className="mt-16">
          <DiscoverFeed />
        </main>
      </div>
    </div>
  );
}

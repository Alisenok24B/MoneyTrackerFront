
import { Dashboard } from "@/components/Dashboard";

const Index = () => {
  return (
    <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
    <div className="min-h-screen bg-background flex">
      {/* <Sidebar /> */}
      <Dashboard />
    </div>
    </main>
  );
};

export default Index;

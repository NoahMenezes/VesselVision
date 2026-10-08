import { Dashboard } from "@/components/Dashboard";
import { StoreProvider } from "@/store/VesselVisionContext";

export default function Home() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
}

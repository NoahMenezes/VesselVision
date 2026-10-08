import { Dashboard } from "@/components/Dashboard";
import { StoreProvider } from "@/store/VesselVisionContext";

export const metadata = {
  title: "Console — VesselVision",
};

export default function Console() {
  return (
    <StoreProvider>
      <Dashboard />
    </StoreProvider>
  );
}

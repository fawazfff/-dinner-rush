import { KitchenConsole } from "@/components/kitchen/kitchen-console";

export default function KitchenPage() {
  return (
    <div className="kitchen-page">
      <KitchenConsole />
      <style>{`
        .kitchen-page button.bg-white.border-black\\/10 {
          background: #0d1c2b !important;
          color: white !important;
          border-color: #0d1c2b !important;
          box-shadow: 0 10px 28px rgba(13, 28, 43, 0.16);
        }
        .kitchen-page button.bg-white.border-black\\/10:hover {
          background: #1c3145 !important;
        }
        .kitchen-page button[class*="bg-[#0d1c2b]"][class*="px-4"][class*="py-2"][class*="text-xs"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

"use client";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export function DJCard({
  name, desc, image, active, onClick,
}: { name: string; desc: string; image: string; active?: boolean; onClick?: () => void }) {
  return (
    <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <Card
        onClick={onClick}
        className={`cursor-pointer rounded-2xl border transition ${
          active ? "border-black shadow-md" : "hover:shadow-sm"
        }`}
      >
        <CardContent className="p-0">
          <div className="aspect-[3/2] w-full overflow-hidden rounded-t-2xl bg-gray-100">
            <img src={image} alt={name} className="h-full w-full object-cover" />
          </div>
          <div className="p-4">
            <div className="font-semibold">{name}</div>
            <div className="text-sm text-gray-600">{desc}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

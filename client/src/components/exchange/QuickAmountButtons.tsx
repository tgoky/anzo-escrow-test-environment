import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuickAmountButtonsProps {
  selectedAmount: string;
  onSelect: (amount: string) => void;
}

export default function QuickAmountButtons({ selectedAmount, onSelect }: QuickAmountButtonsProps) {
  const amounts = ["100", "300", "1000"];

  return (
    <div className="flex gap-3 mt-4">
      {amounts.map((amount) => (
        <Button
          key={amount}
          type="button"
          variant="outline"
          className={cn(
            "flex-1 h-12",
            selectedAmount === amount && "border-black bg-primary/5" // Changed border color to black
          )}
          onClick={() => onSelect(amount)}
        >
          ${Number(amount).toLocaleString()}
        </Button>
      ))}
    </div>
  );
}